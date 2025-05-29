import config from './config';

async function start() {
  console.log('Starting ...');

}

// Start the application
start().catch((error) => {
  console.error('Application error:', error);
  process.exit(1);
});
