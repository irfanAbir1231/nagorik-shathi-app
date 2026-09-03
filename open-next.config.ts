// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
	// R2 is optional. Turso provides the durable application database;
	// leave OpenNext incremental caching disabled for card-free deployment.
});
