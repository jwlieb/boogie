export function createVectorStoreClient(): any {
    console.log('Creating mock Qdrant client...');
    // Return a mock client / placeholder
    return {
      // mock methods 
      upsert: (payload: any) => console.log('Mock upsert:', payload),
    };
  }