import { mutation } from "./_generated/server";

/**
 * Run this ONCE from the Convex dashboard → Functions → seed → Run
 * to populate the initial demo data.
 */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // Guard: don't seed if books already exist
    const existing = await ctx.db.query("books").first();
    if (existing) return "Already seeded — skipping.";

    // Teachers
    const t1 = await ctx.db.insert("teachers", { name: "Mrs. Grace Adusei", department: "Beginners", className: "Lambs", phone: "+233 24 000 0001" });
    const t2 = await ctx.db.insert("teachers", { name: "Mr. Daniel Otoo", department: "Primary", className: "Eagles", phone: "+233 24 000 0002" });
    const t3 = await ctx.db.insert("teachers", { name: "Mrs. Esi Quaye", department: "Juniors", className: "Pathfinders", phone: "+233 24 000 0003" });
    await ctx.db.insert("teachers", { name: "Pastor Kojo Ampah", department: "Earliteens", className: "Ambassadors", phone: "+233 24 000 0004" });

    // Books
    const b1 = await ctx.db.insert("books", { title: "The Great Controversy", author: "Ellen G. White", category: "Spiritual", ageRange: "10-14", department: "Juniors", copies: 2 });
    const b2 = await ctx.db.insert("books", { title: "My Bible Friends", author: "Etta B. Degering", category: "Bible Stories", ageRange: "4-7", department: "Beginners", copies: 3 });
    const b3 = await ctx.db.insert("books", { title: "Uncle Arthur's Bedtime Stories", author: "Arthur Maxwell", category: "Stories", ageRange: "6-10", department: "Primary", copies: 1 });
    await ctx.db.insert("books", { title: "The Desire of Ages", author: "Ellen G. White", category: "Spiritual", ageRange: "12-16", department: "Earliteens", copies: 1 });
    await ctx.db.insert("books", { title: "Pilgrim's Progress (Kids)", author: "John Bunyan", category: "Allegory", ageRange: "8-12", department: "Primary", copies: 2 });

    // Kids
    const k1 = await ctx.db.insert("kids", { name: "Akosua Mensah", age: 8, department: "Primary" });
    const k2 = await ctx.db.insert("kids", { name: "Kwame Boateng", age: 11, department: "Juniors" });
    const k3 = await ctx.db.insert("kids", { name: "Ama Owusu", age: 5, department: "Beginners" });
    await ctx.db.insert("kids", { name: "Yaw Asante", age: 13, department: "Earliteens" });
    await ctx.db.insert("kids", { name: "Adjoa Nkrumah", age: 9, department: "Primary" });

    // Assignments
    const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };
    const daysAhead = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString(); };

    await ctx.db.insert("assignments", { bookId: b1, kidId: k2, teacherId: t3, assignedAt: daysAgo(7), dueDate: daysAhead(7) });
    await ctx.db.insert("assignments", { bookId: b3, kidId: k1, teacherId: t2, assignedAt: daysAgo(20), dueDate: daysAgo(3) });
    await ctx.db.insert("assignments", { bookId: b2, kidId: k3, teacherId: t1, assignedAt: daysAgo(2), dueDate: daysAhead(12) });

    return "Seeded successfully!";
  },
});
