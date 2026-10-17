import { Router } from "express";
import { Order } from "../../models/Order.js";
import { Product } from "../../models/Product.js";
import { FormSubmission } from "../../models/FormSubmission.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

const router = Router();

router.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const [productCount, orderCount, paidOrders, revenueAgg, unreadSubmissions, recentOrders] =
      await Promise.all([
        Product.countDocuments(),
        Order.countDocuments(),
        Order.countDocuments({ paymentStatus: "paid" }),
        Order.aggregate([
          { $match: { paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]),
        FormSubmission.countDocuments({ read: false }),
        Order.find().sort({ createdAt: -1 }).limit(8).select("orderNumber total paymentStatus fulfillmentStatus createdAt"),
      ]);

    const revenue = revenueAgg[0]?.total ?? 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const salesByDay = await Order.aggregate([
      { $match: { paymentStatus: "paid", createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      summary: {
        productCount,
        orderCount,
        paidOrders,
        revenue,
        unreadSubmissions,
      },
      salesByDay,
      recentOrders,
    });
  }),
);

export default router;
