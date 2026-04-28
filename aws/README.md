# AWS SEO Migration

Use `cloudfront-redirect-function.js` on the production CloudFront distribution as a viewer-request function.

The goal is to preserve current WapiPay SEO value:

- Force the canonical host to `www.wapipay.com`.
- Redirect duplicate `index.html` URLs to clean URLs.
- Move common legacy paths to the new closest matching page.
- Keep FAQ backlinks flowing into `/faq/`.
- Send developer-documentation intent to `https://docs.wapipay.io/`.

Deployment checklist:

1. Publish the static site to the current production origin.
2. Attach `cloudfront-redirect-function.js` to the CloudFront viewer-request event.
3. Invalidate CloudFront paths: `/*`.
4. Test old URLs with `curl -I` and confirm they return `301`, not `200` or `404`.
5. Submit `https://www.wapipay.com/sitemap.xml` in Google Search Console after launch.

Keep `redirects.json` as the migration source of truth for any AWS rule system that is not CloudFront Functions.
