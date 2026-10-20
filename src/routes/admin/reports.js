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

    const [
      productsByCategory,
      ordersByPaymentStatus,
      ordersByFulfillment,
      topProducts,
      inStockCount,
      featuredCount,
    ] = await Promise.all([
      Product.aggregate([
        { $match: { published: true } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Order.aggregate([{ $group: { _id: "$paymentStatus", count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: "$fulfillmentStatus", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.slug",
            name: { $first: "$items.name" },
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 8 },
      ]),
      Product.countDocuments({ published: true, inStock: true }),
      Product.countDocuments({ published: true, featured: true }),
    ]);

    const avgOrderValue = paidOrders > 0 ? Math.round(revenue / paidOrders) : 0;

    res.json({
      summary: {
        productCount,
        orderCount,
        paidOrders,
        revenue,
        unreadSubmissions,
        avgOrderValue,
        inStockCount,
        featuredCount,
      },
      salesByDay,
      recentOrders,
      productsByCategory,
      ordersByPaymentStatus,
      ordersByFulfillment,
      topProducts,
    });
  }),
);

export default router;
