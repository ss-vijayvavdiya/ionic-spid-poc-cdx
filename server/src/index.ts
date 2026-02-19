import { createApp } from './app';
import { getDb } from './db';
import { config } from './utils/config';
import { logError, logInfo } from './utils/logger';

async function bootstrap(): Promise<void> {
  try {
    await getDb();

    const app = createApp();

    app.listen(config.port, () => {
      logInfo(`Server running on http://localhost:${config.port}`);
      logInfo(`Public BASE_URL: ${config.baseUrl}`);
      logInfo(`Signicat redirect URI: ${config.redirectUri}`);
    });
  } catch (error) {
    logError('Failed to bootstrap server', error);
    process.exit(1);
  }
}

void bootstrap();
