import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyFactoryDetailRedirect() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!id) return <Redirect href="/(app)/(tabs)/work" />;
  return <Redirect href={{ pathname: '/(app)/md/factory/[id]' as never, params: { id } } as never} />;
}
