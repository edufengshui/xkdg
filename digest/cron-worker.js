// Cloudflare Worker "xkdg-digest-cron" (session 32). GitHub's own schedule started the daily
// digest hours late or not at all, so this Worker's Cron Trigger (`15 4 * * *` UTC = 05:15
// Vienna in winter, 06:15 in summer) asks GitHub to run the workflow, exactly like the
// "Run workflow" button. Secret GH_TOKEN = fine-grained token, repo xkdg only, Actions: read & write.
export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(run(env)); },
  async fetch() { return new Response('xkdg digest cron: ok'); }
};
async function run(env) {
  const r = await fetch('https://api.github.com/repos/edufengshui/xkdg/actions/workflows/daily-digest.yml/dispatches', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + env.GH_TOKEN, 'Accept': 'application/vnd.github+json',
               'User-Agent': 'xkdg-digest-cron', 'X-GitHub-Api-Version': '2022-11-28' },
    body: JSON.stringify({ ref: 'main' })
  });
  if (r.status !== 204) throw new Error('GitHub ' + r.status + ' ' + await r.text());
}
