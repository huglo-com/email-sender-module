import {
  Module,
  fileType,
  generateKeyPair,
  signObject,
  InMemoryDirectoryClient,
  InMemoryGrantStore,
  InMemoryHugloOAuthClient,
  type SignedGrant,
} from "@huglo/module-sdk";
import {
  emailConfigDefinition,
  EmailInputSchema,
  EmailResultSchema,
} from "../../src/lib/schemas.js";
import { configStore } from "../../src/services/config-store.js";
import { sendEmail } from "../../src/scopes/email.send.js";
import type { SmtpConfig } from "../../src/lib/schemas.js";

export const TEST_SUBJECT = "huglo:user:test-user";
export const OAUTH_CLIENT_SECRET = "test-oauth-secret";

export const TEST_SMTP: SmtpConfig = {
  host: "smtp.example.com",
  port: 587,
  secure: false,
  username: "user@example.com",
  password: "secret",
  fromAddress: "sender@example.com",
  fromName: "Test Sender",
};

export interface TestHarness {
  port: number;
  endpoint: string;
  directory: InMemoryDirectoryClient;
  grantStore: InMemoryGrantStore;
  emailModule: Module;
  requesterModule: Module;
  authorKeys: ReturnType<typeof generateKeyPair>;
  buildGrant: (overrides?: Partial<SignedGrant["grant"]>) => SignedGrant;
  cleanup: () => void;
}

export async function createTestHarness(): Promise<TestHarness> {
  const emailKeys = generateKeyPair();
  const requesterKeys = generateKeyPair();
  const authorKeys = generateKeyPair();
  const directory = new InMemoryDirectoryClient();
  const grantStore = new InMemoryGrantStore();
  const oauthClient = new InMemoryHugloOAuthClient({
    defaultSubject: TEST_SUBJECT,
  });

  const port = 9500 + Math.floor(Math.random() * 1000);
  const requesterPort = port + 1;
  const endpoint = `http://127.0.0.1:${port}`;
  const requesterEndpoint = `http://127.0.0.1:${requesterPort}`;

  const emailModule = new Module({
    id: "email-sender",
    name: "Email Sender",
    description: "Send email via per-subject SMTP configuration",
    version: "0.1.0",
    keyPair: emailKeys,
    grantStore,
    configStore,
    endpoint,
    directory,
    oauthClient,
    oauth: {
      clientId: "test-client",
      clientSecret: OAUTH_CLIENT_SECRET,
      redirectUri: `${endpoint}/config/callback`,
      authorizeUrl: "https://oauth.test/authorize",
      tokenUrl: "https://oauth.test/token",
      userInfoUrl: "https://oauth.test/userinfo",
    },
  });

  emailModule.config(emailConfigDefinition);
  emailModule.registerType(fileType);

  emailModule.scope("email:send", {
    description: "Send an email to a recipient",
    input: EmailInputSchema,
    output: EmailResultSchema,
    handler: sendEmail,
  });

  const requesterModule = new Module({
    id: "requester",
    name: "Requester",
    description: "Test requester",
    version: "1.0.0",
    keyPair: requesterKeys,
    huglo: { directoryUrl: "http://unused" },
    directory,
  });

  directory.registerModule(
    "email-sender",
    endpoint,
    emailKeys.publicKey,
    emailKeys.publicKeyBase64,
  );
  directory.registerModule(
    "requester",
    requesterEndpoint,
    requesterKeys.publicKey,
    requesterKeys.publicKeyBase64,
  );
  directory.registerUser("test-user", authorKeys.publicKey);

  function buildGrant(overrides: Partial<SignedGrant["grant"]> = {}): SignedGrant {
    const grant = {
      grant_id: "g-email-001",
      holder: "email-sender",
      scope: "email:send",
      subject: TEST_SUBJECT,
      requester: "requester",
      author: TEST_SUBJECT,
      constraints: {},
      issued_at: new Date(Date.now() - 60_000).toISOString(),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      ...overrides,
    };
    return {
      grant,
      signature: signObject(grant, authorKeys.privateKey),
    };
  }

  await emailModule.listen(port, "127.0.0.1");
  await requesterModule.listen(requesterPort, "127.0.0.1");

  return {
    port,
    endpoint,
    directory,
    grantStore,
    emailModule,
    requesterModule,
    authorKeys,
    buildGrant,
    cleanup: () => {
      emailModule.close();
      requesterModule.close();
    },
  };
}
