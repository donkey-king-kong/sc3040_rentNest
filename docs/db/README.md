# Changing the database schema

We share one Supabase PostgreSQL database. This is how schema changes are made without breaking other people's work.

## The rule

**The backend never changes the shared schema.** Every `application.properties` sets:

```properties
spring.jpa.hibernate.ddl-auto=validate
```

`validate` means Hibernate checks the database against the entity classes at startup and **fails to start** if they disagree. It never adds or alters anything. Do not set this back to `update`: with `update`, whoever starts the backend first silently changes the schema for the whole team, with no record and no way to undo it.

## Making a change

1. **Write the SQL first**, as a new file in `docs/db/changes/`, named `YYYY-MM-DD_short_description.sql` (for example `2026-09-20_add_listing_created_at.sql`).
   - Include an `-- Undo:` comment at the end with the SQL that reverses it.
   - Prefer additive changes: new nullable columns and new tables. Dropping or renaming a column breaks teammates still running older code.
2. **Change the entity classes** in the same pull request, so the code and the SQL are reviewed together.
3. **Get the pull request reviewed** by someone who is not the author.
4. **After it is merged, one person runs the SQL once** against the shared database in DBeaver, then tells the team in the group chat.
5. **Everyone pulls.** If someone pulls the new code before the SQL has been run, their backend refuses to start with a schema validation error. That is the mechanism working: the fix is to run the migration, not to switch `ddl-auto` back to `update`.

## Checking for drift

To confirm the shared database matches the code, start the backend normally. If it starts, they match. To check without occupying the usual port:

```bash
cd RentNest
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Dserver.port=8099"
```

Verified on 16 September 2026: the shared database validated cleanly against the entity classes, with no drift.

## Setting up a fresh database

There is no baseline schema file, because the current schema was created by Hibernate rather than by migrations. To create a brand new database (a personal scratch copy, or a test database), start the backend once against the empty database with `-Dspring.jpa.hibernate.ddl-auto=update`, which creates every table from the entity classes, then set it back to `validate`. **Never do this against the shared database.**
