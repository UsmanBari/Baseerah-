/* Baseerah — GET /.netlify/functions/vapid-public-key (public key only; never the private key) */
export default (req) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify({ publicKey: process.env.VAPID_PUBLIC_KEY || "" }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" }
  });
};
