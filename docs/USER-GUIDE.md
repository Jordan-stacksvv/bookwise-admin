# User guide

## Signing in

Open the site and choose **I'm a teacher** or **I'm an admin**, then sign in with Google.

A new person always lands on a waiting screen: "An admin needs to approve your account". The screen updates by itself the moment an admin approves them. Someone who is denied sees "No access".

Admins can open the teacher app too (menu at the bottom of the sidebar, then **Teacher app**). A teacher who opens the admin app can ask for admin access, which an existing admin approves.

## Teachers

### Books
**Books** lists every book with its code, author, category and how many copies are free.
- **Add Book.** A book you add waits for admin approval and shows a Pending label. It cannot be given out until approved. If it is declined, the reason is shown. Edit it to send it again.
- The four icons on each row: reviews for that book, give the book to a kid, edit, delete (asks first).
- Book codes must be unique.

### Kids
**Kids** lists the children. Add a child with their class, date of birth, and parent name and phone. Open a child to see their loans. Age is worked out from the date of birth.

### Giving a book to a child
1. On **Books**, tap the give icon on the book, choose the child and a due date.
2. Children under 10 are blocked. A book that is waiting for approval is blocked.
3. A prompt appears to send the parent the approval link on WhatsApp. This is sent by hand: tap the button and WhatsApp opens with the message ready.
4. The loan shows as waiting for the parent. After the parent approves, it waits for the admin. After the admin approves, it is active.

**Approvals** in the teacher menu (Loan approvals) shows where each loan is in the approval steps.

### During and after the loan
On the **Dashboard**, each active loan shows its due date, a **Review** button and a **Return** button. Overdue loans are marked. Update reading progress from the child's page.

### Reviews
Press **Review** on an active loan (or on the child's page). Type the comments, optionally add chapters and a photo of the handwritten review, and send. It goes to the admin.

Under each review you can see its state: waiting for admin, published, or declined (with the reason). Once published you can copy its link or share it on WhatsApp. **Reviews** in the menu shows everything the admin has published. A book's reviews are also under the speech-bubble icon on **Books**.

Check photos before sending: a child may have written their full name on the paper.

### Other pages
- **Departments** shows each class and its readers.
- **Teachers** lists teachers by class. Teachers without a class are listed first as Unassigned.
- **Calendar** shows due dates and birthdays.
- **My profile** (three-dot menu at the bottom of the sidebar) shows your account and has the install button.

## Parents

A parent receives a link by WhatsApp. It opens a page with no sign-in showing the child, the book, the due date and the borrowing policy. The parent types their name and taps **Approve**. The time, name and policy version are saved. The approval appears for the teacher and admin straight away.

If a published review is shared with them, its link shows the book, the review and the photo, and only the child's first name and last initial.

## Admins

The admin app has a sidebar with a badge on anything waiting for you. The three-dot menu at the bottom has My profile, Install app, Teacher app and Sign out.

### Overview
Books out now, overdue and missing, loans waiting for you, charts of the most read books and reading by class, and a **Needs your attention** list that links to each waiting item.

### Approvals
- **To approve:** loans the parent has approved. **Approve** or **Decline** each one. To do many at once, tick them (or **Select all**) and press **Approve selected**.
- **Parents:** loans still waiting for the parent.
- **History:** everything decided.

### Reviews
Waiting reviews show the photo and the public name (first name and last initial). **Approve** publishes it and creates its public link. **Decline** takes a reason the teacher sees. Taking down a published review kills its public link. Select several and **Publish selected** to do many at once.

### Books, Kids, Teachers
The same screens teachers use, with no approval needed for anything an admin adds. On **Books**, teacher-added books wait at the top under **Books waiting for approval**. Approve or decline each, or tick several and approve them together.

### Import
Add many books, kids or teachers from a spreadsheet. See [IMPORT-API.md](IMPORT-API.md).

### Announcements and Class reading
**Announcements** are posted to every class or chosen classes and show on teachers' dashboards. **Class reading** sets a book for a class to read, with an optional due date and note.

### Birthdays
Children's birthdays this month, with a WhatsApp button to send the parent wishes.

### Fees
When a book is lost or damaged, charge a fee from the overdue list or the loan. The fee is the book's own price if it has one, otherwise the default damage fee. Mark fees paid or waived. The fee, currency and the borrowing policy text are edited in **Settings**.

### Activity
A log of what teachers, parents and admins did, with who and when. Filter by person type, area, dates or words. Download any of these as CSV: activity log, loans, reviews, fees, people, books. The files contain children's names and parents' phone numbers, so keep them private.

### People
- **Waiting for approval.** For each person: **Approve as teacher**, **Approve as admin** or **Deny**. Approving as a teacher links them to a teacher record you already added (it suggests a match by email) or creates one. The class is optional and can be set later on **Teachers**.
- **Approve selected.** Tick several waiting people to approve them as teachers together. Anyone who asked to be an admin is skipped and must be approved one by one.
- **Teachers and admins.** Make admin, remove access, or remove admin rights. The first admin set in the server settings cannot be removed here.

### Settings
Classes (departments), categories, age ranges, the borrowing policy text, the default damage fee and currency, and a replacement price per book.
