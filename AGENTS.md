<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:prisma-workflow-rules -->
# Prisma workflow

This project has no `prisma/migrations` directory — the schema in `prisma/schema.prisma` is applied directly with `prisma db push`.

After changing the schema, run:

```sh
npx prisma generate && npx prisma db push
```

Never pass `--accept-data-loss`. If `db push` refuses because a change looks destructive (dropping a column, adding a unique constraint over existing data, etc.), stop and surface it to the user instead of forcing it through.
<!-- END:prisma-workflow-rules -->
