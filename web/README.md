This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Local host-run development

This app loads local development environment variables from `web/.env.local`.

When you run the Next.js dev server on your machine, use host-reachable service values such as:

- `DB_HOST=localhost`
- `MINIO_ENDPOINT=localhost`
- `MINIO_PORT=9000`
- `MINIO_USE_SSL=false`

Do not use Docker-only service names like `postgres` or `minio` in `web/.env.local` unless the app itself is also running inside Docker.

Then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Environment file notes

- `web/.env.local` is for local host-run Next.js development.
- The repo-root `.env` is primarily used by Docker and self-hosted compose setups.
- If local uploads fail with MinIO auth or connection errors, verify that `web/.env.local` points to your local MinIO instance instead of a remote staging or production endpoint.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Render book page images

Librarians can queue high-fidelity page images for the 3D reader. Run the worker locally to process pending jobs or to re-render a single book:

```bash
npm run render:book-images           # processes the next pending job
npm run render:book-images -- --bookId=42
```
