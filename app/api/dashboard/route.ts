import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { woocommerceService } from "@/services/woocommerce";
import { notificationService } from "@/services/notifications";
import { Order } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const { getSalesRepPerformance, fetchUsersFromCloud, getUserOrderIds } = await import("@/lib/auth/user-store");
    // Force fresh cloud sync so all serverless instances return consistent user counts
    await fetchUsersFromCloud(true);

    const [ordersResult, productsResult, subscribers] = await Promise.allSettled([
      woocommerceService.getOrders({ perPage: 100 }),
      woocommerceService.getProducts({ perPage: 1 }),
      notificationService.getSubscriptions(),
    ]);

    const ordersData = ordersResult.status === "fulfilled" ? ordersResult.value : null;
    const productsData = productsResult.status === "fulfilled" ? productsResult.value : null;
    const subsData = subscribers.status === "fulfilled" ? subscribers.value : [];

    const allStoreOrders: Order[] = ordersData?.items || [];
    const totalProducts = productsData?.total || 0;
    const activeSubscribers = subsData.length;

    // Filter orders according to user role:
    // If user is staff (Sales Rep), only show their own orders!
    const isStaff = session.role === "staff";
    let visibleOrders: Order[] = [];

    if (isStaff) {
      const myOrderIds = new Set(getUserOrderIds(session.username));
      visibleOrders = allStoreOrders.filter((o) => {
        if (myOrderIds.has(o.id)) return true;
        const repMeta = o.meta_data?.find(
          (m: { key: string; value?: unknown }) =>
            m.key === "_sales_rep_username" ||
            m.key === "_created_by" ||
            m.key === "sales_rep"
        );
        if (repMeta && String(repMeta.value).toLowerCase() === session.username.toLowerCase()) {
          return true;
        }
        return false;
      });
    } else {
      visibleOrders = allStoreOrders;
    }

    // Count statuses accurately for visible orders
    let processingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let pendingCount = 0;
    let onHoldCount = 0;

    visibleOrders.forEach((o) => {
      if (o.status === "processing") processingCount++;
      else if (o.status === "completed") completedCount++;
      else if (o.status === "cancelled") cancelledCount++;
      else if (o.status === "pending") pendingCount++;
      else if (o.status === "on-hold") onHoldCount++;
    });

    const statusCounts: Record<string, number> = {
      all: visibleOrders.length,
      processing: processingCount,
      completed: completedCount,
      cancelled: cancelledCount,
      pending: pendingCount,
      "on-hold": onHoldCount,
    };

    // Calculate Store-Wide Revenue metrics
    let storeCompletedRevenue = 0;
    let storePendingRevenue = 0;
    allStoreOrders.forEach((o) => {
      const val = parseFloat(o.total) || 0;
      if (o.status === "completed") {
        storeCompletedRevenue += val;
      } else if (
        o.status !== "cancelled" &&
        o.status !== "failed" &&
        o.status !== "refunded" &&
        o.status !== "trash"
      ) {
        storePendingRevenue += val;
      }
    });

    // Calculate Sales Rep Performance Statistics with live orders
    const repPerf = getSalesRepPerformance(
      {
        username: session.username,
        role: session.role,
      },
      allStoreOrders
    );

    // Calculate Personal Stats for the logged-in session user
    let myCompletedRevenue = 0;
    let myPendingRevenue = 0;
    let myCompletedOrders = 0;
    let myPendingOrders = 0;
    let myCancelledOrders = 0;

    visibleOrders.forEach((o) => {
      const val = parseFloat(o.total) || 0;
      if (o.status === "completed") {
        myCompletedRevenue += val;
        myCompletedOrders += 1;
      } else if (
        o.status !== "cancelled" &&
        o.status !== "failed" &&
        o.status !== "refunded" &&
        o.status !== "trash"
      ) {
        myPendingRevenue += val;
        myPendingOrders += 1;
      } else {
        myCancelledOrders += 1;
      }
    });

    const myStats = {
      id: "me",
      name: session.username,
      username: session.username,
      email: "",
      role: session.role,
      totalOrders: visibleOrders.length,
      completedOrders: myCompletedOrders,
      pendingOrders: myPendingOrders,
      cancelledOrders: myCancelledOrders,
      totalRevenue: myCompletedRevenue,
      completedRevenue: myCompletedRevenue,
      pendingRevenue: myPendingRevenue,
    };

    const dashboardPayload = {
      stats: {
        totalOrders: isStaff ? visibleOrders.length : (ordersData?.total || visibleOrders.length),
        processingOrders: processingCount,
        completedOrders: completedCount,
        cancelledOrders: cancelledCount,
        storeCompletedRevenue,
        storePendingRevenue,
        totalProducts,
        activeSubscribers,
        totalSalesReps: repPerf.totalSalesReps,
      },
      salesRepsStats: repPerf.salesRepsStats,
      myStats,
      currentUser: {
        username: session.username,
        role: session.role,
        name: session.username,
      },
      recentOrders: visibleOrders.slice(0, 15),
      statusCounts,
    };

    return NextResponse.json(
      {
        success: true,
        data: dashboardPayload,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "dashboard_error",
          message: error instanceof Error ? error.message : "Failed to load dashboard data.",
        },
      },
      { status: 500 }
    );
  }
}
