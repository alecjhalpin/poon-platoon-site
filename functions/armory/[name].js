export async function onRequestGet(context) {
  // Pretty character URLs such as /armory/poonslurper serve the shared static character shell.
  const url = new URL(context.request.url);
  url.pathname = '/character';
  url.search = '';
  return context.env.ASSETS.fetch(url);
}
