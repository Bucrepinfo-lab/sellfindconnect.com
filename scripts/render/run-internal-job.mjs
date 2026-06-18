const [, , endpoint, bodyJson = '{}'] = process.argv;

if (!endpoint) {
  throw new Error('Usage: node scripts/render/run-internal-job.mjs <endpoint> [jsonBody]');
}

const baseUrl = process.env.INTERNAL_API_BASE_URL ?? process.env.API_BASE_URL;
const jobKey = process.env.INTERNAL_JOB_KEY;

if (!baseUrl) {
  throw new Error('INTERNAL_API_BASE_URL or API_BASE_URL is required.');
}

if (!jobKey) {
  throw new Error('INTERNAL_JOB_KEY is required.');
}

let body;
try {
  body = JSON.parse(bodyJson);
} catch (error) {
  throw new Error(`Invalid JSON body: ${error.message}`);
}

const target = new URL(endpoint.replace(/^\/+/, ''), `${baseUrl.replace(/\/+$/, '')}/`);
const response = await fetch(target, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-internal-job-key': jobKey,
  },
  body: JSON.stringify(body),
});

const responseText = await response.text();
if (!response.ok) {
  throw new Error(`Internal job failed: ${response.status} ${response.statusText} ${responseText}`);
}

let parsedResponse = responseText;
try {
  parsedResponse = responseText ? JSON.parse(responseText) : null;
} catch {
  parsedResponse = responseText;
}

console.log(
  JSON.stringify({
    status: 'ok',
    endpoint,
    httpStatus: response.status,
    response: parsedResponse,
  }),
);
