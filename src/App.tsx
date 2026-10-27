import { AppProviders } from '@/core/providers/app-providers';
import { AppRouter } from '@/core/router/app-router';

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
