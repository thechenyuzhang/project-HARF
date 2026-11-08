import { defineBackend } from "@aws-amplify/backend";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { submitTestimony } from "./functions/submit-testimony/resource";
import { editorial } from "./functions/editorial/resource";
import { participant } from "./functions/participant/resource";

const backend = defineBackend({ auth, data, storage, submitTestimony, editorial, participant });

const { tables, cfnResources } = backend.data.resources;

// Editors are invited by an administrator; nobody can self-register.
backend.auth.resources.cfnResources.cfnUserPool.adminCreateUserConfig = { allowAdminCreateUserOnly: true };

// Continuous backups for every table: restore to any second in the last 35 days.
for (const table of Object.values(cfnResources.amplifyDynamoDbTables)) {
  table.pointInTimeRecoveryEnabled = true;
}
// Usage events delete themselves after about 13 months.
cfnResources.amplifyDynamoDbTables.AnalyticsEvent.timeToLiveAttribute = { attributeName: "expiresAt", enabled: true };

const submitFn = backend.submitTestimony.resources.lambda;
tables.Testimony.grantReadWriteData(submitFn);
tables.Contact.grantWriteData(submitFn);
tables.WeeklyQuestion.grantReadData(submitFn);
// Table grants don't cover secondary indexes; needed to count a participant's earlier entries.
submitFn.addToRolePolicy(
  new PolicyStatement({ actions: ["dynamodb:Query"], resources: [`${tables.Testimony.tableArn}/index/byParticipant`] }),
);
backend.submitTestimony.addEnvironment("TESTIMONY_TABLE", tables.Testimony.tableName);
backend.submitTestimony.addEnvironment("CONTACT_TABLE", tables.Contact.tableName);
backend.submitTestimony.addEnvironment("WEEKLY_QUESTION_TABLE", tables.WeeklyQuestion.tableName);

const editorialFn = backend.editorial.resources.lambda;
tables.Testimony.grantReadWriteData(editorialFn);
tables.Excerpt.grantReadWriteData(editorialFn);
tables.Contact.grantWriteData(editorialFn);
backend.editorial.addEnvironment("TESTIMONY_TABLE", tables.Testimony.tableName);
backend.editorial.addEnvironment("EXCERPT_TABLE", tables.Excerpt.tableName);
backend.editorial.addEnvironment("CONTACT_TABLE", tables.Contact.tableName);

// Media: uploads/ is a short-lived drop zone; claimed files move to media/.
const bucket = backend.storage.resources.bucket;
backend.storage.resources.cfnResources.cfnBucket.lifecycleConfiguration = {
  rules: [
    {
      id: "expire-unclaimed-uploads",
      status: "Enabled",
      prefix: "uploads/",
      expirationInDays: 1,
      noncurrentVersionExpiration: { noncurrentDays: 1 },
    },
    // Versioning gives media the same 35-day safety net as the tables' backups.
    { id: "expire-old-versions", status: "Enabled", noncurrentVersionExpiration: { noncurrentDays: 35 } },
  ],
};
backend.storage.resources.cfnResources.cfnBucket.versioningConfiguration = { status: "Enabled" };
bucket.grantRead(submitFn, "uploads/*");
bucket.grantDelete(submitFn, "uploads/*");
bucket.grantPut(submitFn, "media/*");
bucket.grantDelete(submitFn, "media/*");
backend.submitTestimony.addEnvironment("MEDIA_BUCKET", bucket.bucketName);
bucket.grantDelete(editorialFn, "media/*");
backend.editorial.addEnvironment("MEDIA_BUCKET", bucket.bucketName);

const participantFn = backend.participant.resources.lambda;
tables.Testimony.grantReadData(participantFn);
// A participant's own entries over time, found by their code.
participantFn.addToRolePolicy(
  new PolicyStatement({ actions: ["dynamodb:Query"], resources: [`${tables.Testimony.tableArn}/index/byParticipant`] }),
);
tables.Contact.grantWriteData(participantFn);
tables.WithdrawalRequest.grantWriteData(participantFn);
tables.AnalyticsEvent.grantWriteData(participantFn);
backend.participant.addEnvironment("TESTIMONY_TABLE", tables.Testimony.tableName);
backend.participant.addEnvironment("CONTACT_TABLE", tables.Contact.tableName);
backend.participant.addEnvironment("WITHDRAWAL_TABLE", tables.WithdrawalRequest.tableName);
backend.participant.addEnvironment("ANALYTICS_TABLE", tables.AnalyticsEvent.tableName);
