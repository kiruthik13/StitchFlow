import { Body, ConflictException, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsUUID, Matches, Max, MaxLength, Min } from 'class-validator';
import { PoolClient } from 'pg';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { FactoryQuery } from '../jobs/jobs.dto';
import { factoryScope, jobScopeParams } from '../jobs/jobs.service';

class MaterialInput {
  @Matches(/\S/)
  @MaxLength(48)
  sku!: string;

  @Matches(/\S/)
  @MaxLength(160)
  name!: string;

  @IsIn(['piece', 'millimeter', 'gram'])
  baseUnit!: string;
}

class StockQuantity {
  @IsInt()
  @Min(1)
  @Max(1000000000)
  quantity!: number;
}

class StockInput extends StockQuantity {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  materialId!: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  locationId!: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  requestId!: string;
}

class MovementInput extends StockInput {
  @Matches(/\S/)
  @MaxLength(160)
  reference!: string;
}

class TransferInput extends StockInput {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  destinationLocationId!: string;
}

class TransferDiscrepancyInput {
  @IsInt()
  @Min(0)
  @Max(1000000000)
  observedQuantity!: number;

  @Matches(/\S/)
  @MaxLength(160)
  reason!: string;
}

class ReturnTransferInput {
  @IsInt()
  @Min(0)
  @Max(1000000000)
  quantity!: number;

  @Matches(/\S/)
  @MaxLength(500)
  lossReason?: string;
}

class CountInput {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  materialId!: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  locationId!: string;

  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, { message: '$property must be a UUID' })
  requestId!: string;

  @IsInt()
  @Min(0)
  @Max(1000000000)
  observedQuantity!: number;

  @Matches(/\S/)
  @MaxLength(160)
  reason!: string;
}

@Injectable()
export class RawMaterialsService {
  constructor(private readonly db: DatabaseService, private readonly audit: AuditService) {}

  async catalog(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(`
      SELECT m.id, m.sku, m.name, m.base_unit AS "baseUnit", gen_random_uuid() AS "requestId" FROM public.raw_materials m
      JOIN public.factories f ON f.organization_id = m.organization_id
      WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR m.id > $5)
      ORDER BY m.id LIMIT 100`, [...jobScopeParams(user), query.factoryId, query.after ?? null]);
    return rows;
  }

  async create(user: AuthenticatedUser, input: MaterialInput) {
    if (user.role !== 'factory-manager' || !user.primaryFactoryId) throw new ForbiddenException('An assigned Factory Manager is required');
    return this.db.withTransaction(async client => {
      const { rows: [material] } = await client.query(`
        INSERT INTO public.raw_materials (organization_id, sku, name, base_unit)
        SELECT f.organization_id, $5, $6, $7 FROM public.factories f
        WHERE ${factoryScope} AND f.id = $4 ON CONFLICT DO NOTHING
        RETURNING id, sku, name, base_unit AS "baseUnit"`,
        [...jobScopeParams(user), user.primaryFactoryId, input.sku.trim(), input.name.trim(), input.baseUnit]);
      if (!material) throw new ConflictException('Material SKU already exists or factory unavailable');
      await this.log(client, user, user.primaryFactoryId!, 'RAW_MATERIAL_CREATED', material.id, {});
      return material;
    });
  }

  async stock(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(`
      SELECT m.id, m.sku, m.name, m.base_unit AS "baseUnit", COALESCE(SUM(CASE
        WHEN h.movement IN ('receipt','transfer-in','adjust-in','transfer-return') THEN h.quantity ELSE -h.quantity END), 0) AS quantity
      FROM public.raw_materials m JOIN public.factories f ON f.organization_id = m.organization_id
      JOIN public.storage_locations l ON l.factory_id = f.id
      JOIN public.raw_material_movements h ON h.material_id = m.id AND h.location_id = l.id
      WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR m.id > $5)
      GROUP BY m.id ORDER BY m.id LIMIT 100`, [...jobScopeParams(user), query.factoryId, query.after ?? null]);
    return rows.map(row => ({ ...row, quantity: Number(row.quantity) }));
  }

  async destinations(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(`
      SELECT l.id, l.code, l.name, d.name AS "factoryName"
      FROM public.factories f JOIN public.factories d ON d.organization_id = f.organization_id AND d.id <> f.id AND d.is_active
      JOIN public.storage_locations l ON l.factory_id = d.id AND l.is_active
      WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR l.id > $5)
      ORDER BY l.id LIMIT 100`, [...jobScopeParams(user), query.factoryId, query.after ?? null]);
    return rows;
  }

  async transfers(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(`
      SELECT t.id, t.quantity, t.sent_at AS "sentAt", t.received_at AS "receivedAt", d.reported_at AS "disputedAt", d.returned_at AS "returnedAt",
        t.sender_id AS "senderId", from_location.name AS "source", to_location.name AS "destination",
        from_location.factory_id AS "sourceFactoryId", to_location.factory_id AS "destinationFactoryId", m.sku, m.base_unit AS "baseUnit"
      FROM public.raw_material_transfers t JOIN public.raw_materials m ON m.id = t.material_id
      JOIN public.storage_locations from_location ON from_location.id = t.source_location_id
      JOIN public.storage_locations to_location ON to_location.id = t.destination_location_id
      LEFT JOIN public.raw_transfer_discrepancies d ON d.transfer_id = t.id
      JOIN public.factories f ON f.id IN (from_location.factory_id, to_location.factory_id) AND f.organization_id = m.organization_id
      WHERE ${factoryScope} AND f.id = $4 AND ($5::uuid IS NULL OR t.id > $5)
      ORDER BY t.id LIMIT 100`, [...jobScopeParams(user), query.factoryId, query.after ?? null]);
    return rows;
  }

  async move(user: AuthenticatedUser, input: MovementInput, movement: 'receipt' | 'issue') {
    this.requireStore(user);
    return this.db.withTransaction(async client => {
      await this.lockMaterial(client, user, input.materialId);
      const factoryId = await this.locationFactory(client, user, input.locationId);
      const reference = input.reference.trim();
      const { rows: [old] } = await client.query(
        'SELECT * FROM public.raw_material_movements WHERE actor_id = $1 AND request_id = $2', [user.id, input.requestId],
      );
      if (old) {
        if (old.material_id !== input.materialId || old.location_id !== input.locationId || old.movement !== movement
          || old.quantity !== input.quantity || old.reference !== reference) throw new ConflictException('Stock request ID has already been used');
        return old;
      }
      if (movement === 'issue') await this.requireStock(client, input.materialId, input.locationId, input.quantity);
      const { rows: [entry] } = await client.query(`
        INSERT INTO public.raw_material_movements (material_id,location_id,actor_id,request_id,movement,quantity,reference)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING *`,
        [input.materialId, input.locationId, user.id, input.requestId, movement, input.quantity, reference]);
      if (!entry) throw new ConflictException('Stock request ID has already been used');
      await this.log(client, user, factoryId, 'RAW_MATERIAL_' + movement.toUpperCase(), entry.id,
        { materialId: input.materialId, locationId: input.locationId, quantity: input.quantity });
      return entry;
    });
  }

  async send(user: AuthenticatedUser, input: TransferInput) {
    this.requireStore(user);
    return this.db.withTransaction(async client => {
      await this.lockMaterial(client, user, input.materialId);
      const sourceFactory = await this.locationFactory(client, user, input.locationId);
      const { rows: [destination] } = await client.query<{ factory_id: string }>(`
        SELECT l.factory_id FROM public.storage_locations l JOIN public.factories f ON f.id = l.factory_id
        WHERE l.id = $1 AND f.organization_id = $2 AND f.id <> $3 AND f.is_active AND l.is_active`,
        [input.destinationLocationId, user.organizationId, sourceFactory]);
      if (!destination) throw new NotFoundException('Destination must be in another active factory in this organization');
      const { rows: [old] } = await client.query(
        'SELECT * FROM public.raw_material_transfers WHERE sender_id = $1 AND request_id = $2', [user.id, input.requestId],
      );
      if (old) {
        if (old.material_id !== input.materialId || old.source_location_id !== input.locationId
          || old.destination_location_id !== input.destinationLocationId || old.quantity !== input.quantity) {
          throw new ConflictException('Transfer request ID has already been used');
        }
        return old;
      }
      await this.requireStock(client, input.materialId, input.locationId, input.quantity);
      const { rows: [transfer] } = await client.query(`
        INSERT INTO public.raw_material_transfers
          (material_id,source_location_id,destination_location_id,quantity,sender_id,request_id)
        VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING *`,
        [input.materialId, input.locationId, input.destinationLocationId, input.quantity, user.id, input.requestId]);
      if (!transfer) throw new ConflictException('Transfer request ID has already been used');
      await this.transferMovement(client, user, transfer.id, input.materialId, input.locationId, input.quantity, 'transfer-out');
      await this.log(client, user, sourceFactory, 'RAW_TRANSFER_SENT', transfer.id, { quantity: input.quantity });
      await this.log(client, user, destination.factory_id, 'RAW_TRANSFER_INBOUND', transfer.id, { quantity: input.quantity });
      return transfer;
    });
  }

  async receive(user: AuthenticatedUser, id: string, quantity: number) {
    this.requireStore(user);
    return this.db.withTransaction(async client => {
      const { rows: [transfer] } = await client.query<{
        id: string; material_id: string; destination_location_id: string; sender_id: string;
        receiver_id: string | null; quantity: number;
      }>(`
        SELECT t.* FROM public.raw_material_transfers t JOIN public.storage_locations l ON l.id = t.destination_location_id
        JOIN public.factories f ON f.id = l.factory_id WHERE ${factoryScope} AND t.id = $4`,
        [...jobScopeParams(user), id]);
      if (!transfer) throw new NotFoundException('Transfer not found in the assigned destination factory');
      await this.lockMaterial(client, user, transfer.material_id);
      const destination = await this.locationFactory(client, user, transfer.destination_location_id);
      const { rows: [current] } = await client.query(
        'SELECT * FROM public.raw_material_transfers WHERE id = $1 FOR UPDATE', [id],
      );
      if (transfer.sender_id === user.id) throw new ForbiddenException('A different employee must receive the transfer');
      if (quantity !== transfer.quantity) throw new ConflictException('Received quantity must match the sent quantity');
      if (current.receiver_id) {
        if (current.receiver_id !== user.id) throw new ConflictException('Transfer was already received');
        return current;
      }
      const dispute = await client.query('SELECT 1 FROM public.raw_transfer_discrepancies WHERE transfer_id = $1', [id]);
      if (dispute.rowCount) throw new ConflictException('A disputed transfer cannot be received');
      await this.transferMovement(client, user, id, transfer.material_id, transfer.destination_location_id, quantity, 'transfer-in');
      const { rows: [saved] } = await client.query(`
        UPDATE public.raw_material_transfers SET receiver_id = $2, received_at = now() WHERE id = $1 RETURNING *`,
        [id, user.id]);
      await this.log(client, user, destination, 'RAW_TRANSFER_RECEIVED', id, { quantity });
      return saved;
    });
  }

  async reportDiscrepancy(user: AuthenticatedUser, id: string, input: TransferDiscrepancyInput) {
    this.requireStore(user);
    return this.db.withTransaction(async client => {
      const { transfer, factoryId } = await this.lockTransfer(client, user, id, false);
      if (transfer.sender_id === user.id || transfer.received_at || transfer.quantity === input.observedQuantity) {
        throw new ConflictException('An independent receiver must report a mismatch for an unresolved transfer');
      }
      const reason = input.reason.trim();
      const { rows: [saved] } = await client.query(`
        INSERT INTO public.raw_transfer_discrepancies (transfer_id, observed_quantity, reported_by, reason)
        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING *`, [id, input.observedQuantity, user.id, reason]);
      if (!saved) {
        const { rows: [old] } = await client.query('SELECT * FROM public.raw_transfer_discrepancies WHERE transfer_id = $1', [id]);
        if (old?.observed_quantity === input.observedQuantity && old.reported_by === user.id && old.reason === reason) return old;
        throw new ConflictException('Transfer already has a recorded discrepancy');
      }
      await this.log(client, user, factoryId, 'RAW_TRANSFER_DISCREPANCY', id, { observed: input.observedQuantity });
      return saved;
    });
  }

  async returnTransfer(user: AuthenticatedUser, id: string, quantity: number, lossReason?: string) {
    this.requireStore(user);
    return this.db.withTransaction(async client => {
      const { transfer, factoryId } = await this.lockTransfer(client, user, id, true);
      const { rows: [dispute] } = await client.query(
        'SELECT * FROM public.raw_transfer_discrepancies WHERE transfer_id = $1 FOR UPDATE', [id],
      );
      if (!dispute || transfer.received_at || transfer.sender_id !== user.id || dispute.reported_by === user.id
        || quantity < 0 || quantity > transfer.quantity) {
        throw new ConflictException('The original sender must verify a valid recovered return quantity (0 to sent quantity)');
      }
      if (dispute.returned_at) return dispute;
      const lossQuantity = transfer.quantity - quantity;
      if (quantity > 0) {
        await this.transferMovement(client, user, id, transfer.material_id, transfer.source_location_id, quantity, 'transfer-return');
      }
      const { rows: [saved] } = await client.query(`
        UPDATE public.raw_transfer_discrepancies
        SET returned_by = $2, returned_at = now(), recovered_quantity = $3, loss_quantity = $4, loss_reason = $5
        WHERE transfer_id = $1 RETURNING *`, [id, user.id, quantity, lossQuantity, lossReason?.trim() ?? null]);
      await this.log(client, user, factoryId, lossQuantity > 0 ? 'RAW_TRANSFER_PARTIAL_RETURN' : 'RAW_TRANSFER_RETURNED', id,
        { recoveredQuantity: quantity, lossQuantity });
      return saved;
    });
  }

  private async lockTransfer(client: PoolClient, user: AuthenticatedUser, id: string, source: boolean) {
    const field = source ? 'source_location_id' : 'destination_location_id';
    const { rows: [snapshot] } = await client.query(`
      SELECT t.* FROM public.raw_material_transfers t JOIN public.storage_locations l ON l.id = t.${field}
      JOIN public.factories f ON f.id = l.factory_id WHERE ${factoryScope} AND t.id = $4`, [...jobScopeParams(user), id]);
    if (!snapshot) throw new NotFoundException('Transfer not found in assigned factory');
    await this.lockMaterial(client, user, snapshot.material_id);
    const factoryId = await this.locationFactory(client, user, snapshot[field]);
    const { rows: [transfer] } = await client.query('SELECT * FROM public.raw_material_transfers WHERE id = $1 FOR UPDATE', [id]);
    return { transfer, factoryId };
  }

  async counts(user: AuthenticatedUser, query: FactoryQuery) {
    const { rows } = await this.db.query(`
      SELECT c.id, c.expected_quantity::float8 AS "expectedQuantity", c.observed_quantity AS "observedQuantity",
        c.reason, c.approved_at AS "approvedAt", m.sku, m.base_unit AS "baseUnit", l.name AS location
      FROM public.raw_stock_counts c JOIN public.raw_materials m ON m.id = c.material_id
      JOIN public.storage_locations l ON l.id = c.location_id JOIN public.factories f ON f.id = l.factory_id
      WHERE ${factoryScope} AND f.id = $4 AND m.organization_id = f.organization_id AND ($5::uuid IS NULL OR c.id > $5)
      ORDER BY c.id LIMIT 100`, [...jobScopeParams(user), query.factoryId, query.after ?? null]);
    return rows;
  }

  async count(user: AuthenticatedUser, input: CountInput) {
    this.requireStore(user);
    return this.db.withTransaction(async client => {
      await this.lockMaterial(client, user, input.materialId);
      const factoryId = await this.locationFactory(client, user, input.locationId);
      const { rows: [previous] } = await client.query(
        'SELECT * FROM public.raw_stock_counts WHERE actor_id = $1 AND request_id = $2', [user.id, input.requestId],
      );
      const reason = input.reason.trim();
      if (previous) {
        if (previous.material_id !== input.materialId || previous.location_id !== input.locationId
          || previous.observed_quantity !== input.observedQuantity || previous.reason !== reason) {
          throw new ConflictException('Stock count request ID was already used');
        }
        return previous;
      }
      const expected = await this.balance(client, input.materialId, input.locationId);
      const { rows: [saved] } = await client.query(`
        INSERT INTO public.raw_stock_counts
          (material_id,location_id,actor_id,request_id,observed_quantity,expected_quantity,reason)
        VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING *`,
        [input.materialId, input.locationId, user.id, input.requestId, input.observedQuantity, expected, reason]);
      if (!saved) throw new ConflictException('Stock count request ID was already used');
      await this.log(client, user, factoryId, 'RAW_COUNT_SUBMITTED', saved.id, { expected, observed: input.observedQuantity });
      return saved;
    });
  }

  async approveCount(user: AuthenticatedUser, id: string) {
    if (user.role !== 'factory-manager') throw new ForbiddenException('Only a Factory Manager may approve a stock adjustment');
    return this.db.withTransaction(async client => {
      const { rows: [snapshot] } = await client.query(`
        SELECT c.* FROM public.raw_stock_counts c JOIN public.storage_locations l ON l.id = c.location_id
        JOIN public.factories f ON f.id = l.factory_id WHERE ${factoryScope} AND c.id = $4`, [...jobScopeParams(user), id]);
      if (!snapshot) throw new NotFoundException('Stock count not found');
      await this.lockMaterial(client, user, snapshot.material_id);
      const factory = await this.locationFactory(client, user, snapshot.location_id);
      const { rows: [current] } = await client.query(
        'SELECT * FROM public.raw_stock_counts WHERE id = $1 FOR UPDATE', [id],
      );
      if (current.actor_id === user.id) throw new ForbiddenException('The recorder cannot approve their own count');
      if (current.approved_at) return current;
      const expected = await this.balance(client, snapshot.material_id, snapshot.location_id);
      if (expected !== Number(current.expected_quantity)) throw new ConflictException('Stock changed after the count; submit a fresh count');
      const delta = current.observed_quantity - expected;
      if (delta !== 0) await client.query(`
        INSERT INTO public.raw_material_movements (material_id,location_id,actor_id,request_id,movement,quantity,reference)
        VALUES ($1,$2,$3,$4,$5,$6,$4::uuid::text)`,
        [snapshot.material_id, snapshot.location_id, user.id, id, delta > 0 ? 'adjust-in' : 'adjust-out', Math.abs(delta)]);
      const { rows: [saved] } = await client.query(`
        UPDATE public.raw_stock_counts SET approved_by = $2, approved_at = now() WHERE id = $1 RETURNING *`, [id, user.id]);
      await this.log(client, user, factory, 'RAW_COUNT_APPROVED', id, { expected, observed: current.observed_quantity, delta });
      return saved;
    });
  }

  private requireStore(user: AuthenticatedUser) {
    if (user.role !== 'store-dispatch') throw new ForbiddenException('Store Staff execute stock movements');
  }

  private async lockMaterial(client: PoolClient, user: AuthenticatedUser, id: string) {
    const { rowCount } = await client.query(
      'SELECT id FROM public.raw_materials WHERE id = $1 AND organization_id = $2 FOR UPDATE', [id, user.organizationId],
    );
    if (!rowCount) throw new NotFoundException('Raw material not found');
  }

  private async locationFactory(client: PoolClient, user: AuthenticatedUser, locationId: string) {
    const { rows: [location] } = await client.query<{ factory_id: string }>(`
      SELECT l.factory_id FROM public.storage_locations l JOIN public.factories f ON f.id = l.factory_id
      WHERE ${factoryScope} AND l.id = $4 AND l.is_active`, [...jobScopeParams(user), locationId]);
    if (!location) throw new NotFoundException('Location not found in an assigned factory');
    return location.factory_id;
  }

  private async requireStock(client: PoolClient, material: string, location: string, quantity: number) {
    if (await this.balance(client, material, location) < quantity) throw new ConflictException('Movement exceeds available stock');
  }

  private async balance(client: PoolClient, material: string, location: string) {
    const { rows: [stock] } = await client.query<{ quantity: string }>(`
      SELECT COALESCE(SUM(CASE WHEN movement IN ('receipt','transfer-in','adjust-in','transfer-return') THEN quantity ELSE -quantity END),0) AS quantity
      FROM public.raw_material_movements WHERE material_id = $1 AND location_id = $2`, [material, location]);
    return Number(stock.quantity);
  }

  private async transferMovement(client: PoolClient, user: AuthenticatedUser, id: string, material: string,
    location: string, quantity: number, movement: 'transfer-in' | 'transfer-out' | 'transfer-return') {
    await client.query(`
      INSERT INTO public.raw_material_movements (material_id,location_id,actor_id,transfer_id,movement,quantity,reference)
      VALUES ($1,$2,$3,$4,$5,$6,$4::uuid::text)`, [material, location, user.id, id, movement, quantity]);
  }

  private log(client: PoolClient, user: AuthenticatedUser, factoryId: string, action: string, id: string, newValues: object) {
    return this.audit.record({
      organizationId: user.organizationId, factoryId, actorId: user.id, actorEmployeeId: user.employeeId,
      actorName: user.name, actorRole: user.role, action, entityType: 'raw_stock', entityId: id, newValues: { ...newValues },
    }, client);
  }
}

@ApiTags('Raw-material inventory')
@ApiBearerAuth()
@Controller('inventory/raw')
@RequirePermissions('CAN_MANAGE_INVENTORY')
export class RawMaterialsController {
  constructor(private readonly inventory: RawMaterialsService) {}

  @Get('materials')
  catalog(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) { return this.inventory.catalog(user, query); }

  @Post('materials')
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: MaterialInput) { return this.inventory.create(user, body); }

  @Get('stock')
  stock(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) { return this.inventory.stock(user, query); }

  @Get('destinations')
  destinations(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) { return this.inventory.destinations(user, query); }

  @Get('transfers')
  transfers(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) { return this.inventory.transfers(user, query); }

  @Post('receipts')
  receipt(@CurrentUser() user: AuthenticatedUser, @Body() body: MovementInput) { return this.inventory.move(user, body, 'receipt'); }

  @Post('issues')
  issue(@CurrentUser() user: AuthenticatedUser, @Body() body: MovementInput) { return this.inventory.move(user, body, 'issue'); }

  @Post('transfers')
  send(@CurrentUser() user: AuthenticatedUser, @Body() body: TransferInput) { return this.inventory.send(user, body); }

  @Get('counts')
  counts(@CurrentUser() user: AuthenticatedUser, @Query() query: FactoryQuery) { return this.inventory.counts(user, query); }

  @Post('counts')
  count(@CurrentUser() user: AuthenticatedUser, @Body() body: CountInput) { return this.inventory.count(user, body); }

  @Post('counts/:id/approve')
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.inventory.approveCount(user, id);
  }

  @Post('transfers/:id/discrepancies')
  discrepancy(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: TransferDiscrepancyInput) {
    return this.inventory.reportDiscrepancy(user, id, body);
  }

  @Post('transfers/:id/return')
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: ReturnTransferInput) {
    return this.inventory.returnTransfer(user, id, body.quantity, body.lossReason);
  }

  @Post('transfers/:id/receive')
  receive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() body: StockQuantity) {
    return this.inventory.receive(user, id, body.quantity);
  }
}
