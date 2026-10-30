# Batch import

Two ways to add many books, kids or teachers at once. Both use the same rules.

## Admin > Import (spreadsheet)

1. Choose **Books**, **Kids** or **Teachers**.
2. Press **Template** to download a CSV with the right column names, fill it in Excel, and save as CSV. Or paste rows into the box.
3. Press **Choose CSV file** (or paste). The first row must be the column names. Comma, semicolon and tab separators all work.
4. Press **Check**. Nothing is saved. You see how many will be added, which rows are skipped because they already exist, and which rows have problems (with the row number).
5. Press **Import**. Up to 1,000 rows at a time.

## HTTP endpoint (for scripts)

The endpoint is **off** until you set a key.

### Turn it on
```powershell
npx convex env set IMPORT_API_KEY <a long random string, 24+ characters>
```
Add `--prod` for the production deployment. To turn it off again, remove the variable (`npx convex env remove IMPORT_API_KEY`).

Treat the key like a password: it allows adding data without signing in. Do not put it in the repo or in a web page.

### Call it
The address uses your deployment's `.convex.site` address (not `.convex.cloud`), shown in the Convex dashboard under **Settings, URL and Deploy Key**.

```
POST https://<deployment>.convex.site/import/books
POST https://<deployment>.convex.site/import/kids
POST https://<deployment>.convex.site/import/teachers
Authorization: Bearer <IMPORT_API_KEY>
Content-Type: application/json
```

Body:
```json
{
  "rows": [
    { "title": "Heidi", "author": "Johanna Spyri", "category": "Classics", "ageRange": "8-12", "department": "Juniors", "copies": 2, "code": "B-101", "price": 35 }
  ],
  "dryRun": false
}
```
- `dryRun: true` (or `?dryRun=true` on the address) checks everything and saves nothing.
- At most 500 rows per call. Send several calls for more.

PowerShell:
```powershell
$body = @{ rows = @(@{ title = "Heidi"; author = "Johanna Spyri"; copies = 2 }) } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri "https://<deployment>.convex.site/import/books" `
  -Headers @{ Authorization = "Bearer $env:IMPORT_API_KEY" } -ContentType "application/json" -Body $body
```

curl:
```bash
curl -X POST "https://<deployment>.convex.site/import/books" \
  -H "Authorization: Bearer $IMPORT_API_KEY" -H "Content-Type: application/json" \
  -d '{"rows":[{"title":"Heidi","author":"Johanna Spyri","copies":2}]}'
```

### Response
```json
{ "kind": "books", "dryRun": false, "total": 3, "created": 2,
  "skipped": [ { "row": 2, "reason": "Code B-101 is already used by \"Heidi\"." } ],
  "errors":  [ { "row": 3, "message": "Title is missing." } ] }
```
Rows are numbered from 1. Good rows are saved even when other rows have problems. The whole call is one transaction, so a failure never leaves half a batch.

| Status | Meaning |
|---|---|
| 200 | Done (check `errors` and `skipped` for rows that were not added) |
| 400 | Body is not JSON, has no `rows`, has no rows, or has more than 500 |
| 401 | Missing or wrong key |
| 413 | Request is larger than 2 MB |
| 503 | `IMPORT_API_KEY` is not set, or is shorter than 24 characters |

## Columns

Column names are not case sensitive and spaces do not matter. Any of the names listed works. Unknown columns are ignored.

### Books
| Field | Accepted names | Rules and default |
|---|---|---|
| title | title, book name, name | Required, 200 characters |
| author | author, writer, by | Default `Unknown` |
| category | category, genre, type | Default `General` |
| ageRange | age range, age, age group | Default `All ages` |
| department | department, class, group | Default `All classes` |
| copies | copies, qty, quantity, count | Whole number 1 to 500. Default 1 |
| code | code, book code, id, isbn | Unique. A code that exists is skipped |
| price | price, cost | 0 to 100000. Currency symbols are ignored |

Without a code, a row with the same title and author as an existing book is skipped. Books imported this way are live (no approval needed). New categories, age ranges and classes are added to the Settings lists.

### Kids
| Field | Accepted names | Rules and default |
|---|---|---|
| name | name, full name, child | Required |
| birthdate | date of birth, dob, birthday | `DD/MM/YYYY` or `YYYY-MM-DD`. Must be a real date, not in the future |
| age | age | Whole number 0 to 25. Used when there is no date of birth |
| department | department, class | Default `Unassigned` |
| parentName | parent name, parent, guardian | Optional |
| parentPhone | parent phone, phone, contact, whatsapp | Spaces and dashes are removed |

Either a date of birth or an age is required. A child with the same name in the same class is skipped.

### Teachers
| Field | Accepted names | Rules and default |
|---|---|---|
| name | name, full name, teacher | Required |
| department | department, dept | Default `Unassigned` |
| className | class name, class | Optional |
| phone | phone, mobile, contact | Spaces and dashes are removed |
| email | email | Must look like an email. A teacher with that email is skipped |

Importing a teacher does not give them access to the app. They still sign in and are approved under **People**; if the email matches, their record is linked automatically.

## Safety

- The admin page runs only for admins. The endpoint runs only with the key, compared in constant time.
- Text is trimmed and length-limited; numbers and dates are checked before anything is saved.
- Every import is written to the Activity log (`import.books`, `import.kids`, `import.teachers`). Calls made with the key show as **API import**.
