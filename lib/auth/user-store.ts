import dns from "dns";
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { Order } from "@/types";

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  username: string;
  passwordHash: string;
  role: "admin" | "manager" | "staff";
  createdAt: string;
}

// Helper to hash password with salt
export function hashPassword(password: string): string {
  const salt = "demo-store_secure_salt_2026";
  return crypto.createHash("sha256").update(password + salt).digest("hex");
}

const WC_USERS_META_KEY = "demo-store_team_users";
const WC_PASSCODE_META_KEY = "demo-store_master_passcode";
const WC_ORDERS_META_KEY = "demo-store_sales_rep_orders";

let cachedMetadataCustomerId: number | null = null;

function getWcAuthHeader(): string {
  const key = process.env.WOOCOMMERCE_CONSUMER_KEY || "ck_81feadcfea9035a0e43ece826b0b973a0f75dbfe";
  const secret = process.env.WOOCOMMERCE_CONSUMER_SECRET || "cs_6ad11d2d510d554139f7e757cf4ae98dcf8b3b5f";
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

function getWcBaseUrl(): string {
  const url = process.env.WOOCOMMERCE_API_URL || "https://itsemranraj.com/sss/wp-json/wc/v3";
  return url.replace(/\/+$/, "");
}

export async function getOrCreateMetadataCustomerId(): Promise<number | null> {
  if (cachedMetadataCustomerId) return cachedMetadataCustomerId;

  try {
    const listRes = await fetch(`${getWcBaseUrl()}/customers?per_page=1`, {
      headers: { Authorization: getWcAuthHeader(), "User-Agent": "StoreERP/1.0" },
      cache: "no-store",
    });

    if (listRes.ok) {
      const customers = await listRes.json();
      if (Array.isArray(customers) && customers.length > 0 && customers[0].id) {
        cachedMetadataCustomerId = customers[0].id;
        return cachedMetadataCustomerId;
      }
    }

    const createRes = await fetch(`${getWcBaseUrl()}/customers`, {
      method: "POST",
      headers: {
        Authorization: getWcAuthHeader(),
        "Content-Type": "application/json",
        "User-Agent": "StoreERP/1.0",
      },
      body: JSON.stringify({
        email: "system.meta@store-erp.internal",
        first_name: "Store ERP",
        last_name: "Cloud Metadata",
        username: "store_erp_metadata_user",
      }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      if (created?.id) {
        cachedMetadataCustomerId = created.id;
        return cachedMetadataCustomerId;
      }
    }
  } catch {
    // Non-blocking
  }
  return null;
}

// Background sync to WooCommerce Customer Metadata
async function syncMetadataToWooCommerce(key: string, value: string): Promise<boolean> {
  try {
    const customerId = await getOrCreateMetadataCustomerId();
    if (!customerId) return false;

    const res = await fetch(`${getWcBaseUrl()}/customers/${customerId}`, {
      method: "PUT",
      headers: {
        Authorization: getWcAuthHeader(),
        "Content-Type": "application/json",
        "User-Agent": "StoreERP/1.0",
      },
      body: JSON.stringify({
        meta_data: [{ key, value }],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

let dynamicMasterPasscode = process.env.MASTER_PASSCODE || "DemoMaster2026!#";
const PASSCODE_FILE = path.join(os.tmpdir(), "demo-store_admin_passcode.txt");

export function getMasterAdminPasscode(): string {
  try {
    if (fs.existsSync(PASSCODE_FILE)) {
      const code = fs.readFileSync(PASSCODE_FILE, "utf-8").trim();
      if (code) {
        dynamicMasterPasscode = code;
        return code;
      }
    }
  } catch {
    // Ignore
  }
  return dynamicMasterPasscode;
}

export async function setMasterAdminPasscode(newCode: string): Promise<boolean> {
  if (!newCode || newCode.trim().length < 4) return false;
  dynamicMasterPasscode = newCode.trim();
  try {
    fs.writeFileSync(PASSCODE_FILE, dynamicMasterPasscode, "utf-8");
  } catch {
    // Ignore
  }
  await syncMetadataToWooCommerce(WC_PASSCODE_META_KEY, dynamicMasterPasscode);
  return true;
}

export interface UserOrderLog {
  username: string;
  orderId: number;
  total: number;
  createdAt: string;
}

const ORDERS_LOG_FILE = path.join(os.tmpdir(), "demo-store_sales_rep_orders.json");
let inMemoryOrderLogs: UserOrderLog[] = [];
let isOrdersLoaded = false;

function loadOrderLogs(): UserOrderLog[] {
  if (isOrdersLoaded && inMemoryOrderLogs.length > 0) return inMemoryOrderLogs;
  try {
    if (fs.existsSync(ORDERS_LOG_FILE)) {
      const raw = fs.readFileSync(ORDERS_LOG_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        inMemoryOrderLogs = list;
        isOrdersLoaded = true;
        return inMemoryOrderLogs;
      }
    }
  } catch {
    // Ignore
  }
  isOrdersLoaded = true;
  return inMemoryOrderLogs;
}

export function recordUserOrder(username: string, orderId: number, total: number) {
  const logs = loadOrderLogs();
  const clean = (username || "unknown").toLowerCase().trim();
  // Avoid duplicate log for same order
  if (!logs.some((l) => l.orderId === orderId)) {
    logs.push({
      username: clean,
      orderId,
      total: typeof total === "number" ? total : parseFloat(String(total)) || 0,
      createdAt: new Date().toISOString(),
    });
  }
  inMemoryOrderLogs = logs;
  try {
    fs.writeFileSync(ORDERS_LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch {
    // Ignore
  }
  syncMetadataToWooCommerce(WC_ORDERS_META_KEY, JSON.stringify(logs));
}

export function removeUserOrder(orderId: number) {
  const logs = loadOrderLogs();
  const filtered = logs.filter((l) => l.orderId !== orderId);
  inMemoryOrderLogs = filtered;
  try {
    fs.writeFileSync(ORDERS_LOG_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  } catch {
    // Ignore
  }
  syncMetadataToWooCommerce(WC_ORDERS_META_KEY, JSON.stringify(filtered));
}

export function getUserOrderIds(username: string): number[] {
  const logs = loadOrderLogs();
  const clean = (username || "").toLowerCase().trim();
  return logs.filter((log) => log.username.toLowerCase() === clean).map((log) => log.orderId);
}

export interface SalesRepStat {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  completedRevenue: number;
  pendingRevenue: number;
  lastOrderAt?: string;
}

export function ensureSessionUserExists(sessionUser: { username: string; role?: string; name?: string }): SystemUser {
  let user = findUserByUsernameOrEmail(sessionUser.username);
  if (!user) {
    user = {
      id: `usr_${sessionUser.username}_session`,
      name: sessionUser.name || sessionUser.username,
      email: sessionUser.username.includes("@") ? sessionUser.username : `${sessionUser.username}@store.local`,
      username: sessionUser.username,
      passwordHash: "",
      role: (sessionUser.role as "admin" | "staff") || "staff",
      createdAt: new Date().toISOString(),
    };
    inMemoryUsers.push(user);
  }
  return user;
}

export function getSalesRepPerformance(
  currentSession?: { username: string; role?: string; name?: string },
  orders?: Order[]
): {
  salesRepsStats: SalesRepStat[];
  totalSalesReps: number;
  allStaffStats: Record<
    string,
    {
      totalOrders: number;
      completedOrders: number;
      pendingOrders: number;
      cancelledOrders: number;
      totalRevenue: number;
      completedRevenue: number;
      pendingRevenue: number;
      lastOrderAt?: string;
    }
  >;
} {

  const users = getAllUsers();
  const logs = loadOrderLogs();
  const staffUsers = users.filter((u: SystemUser) => u.role === "staff");

  // Create a fast lookup from orderId -> username
  const orderUserMap = new Map<number, string>();
  logs.forEach((l) => {
    if (l.orderId && l.username) {
      orderUserMap.set(l.orderId, l.username.toLowerCase().trim());
    }
  });

  const statMap: Record<
    string,
    {
      totalOrders: number;
      completedOrders: number;
      pendingOrders: number;
      cancelledOrders: number;
      totalRevenue: number;
      completedRevenue: number;
      pendingRevenue: number;
      lastOrderAt?: string;
    }
  > = {};

  const getOrCreate = (userKey: string) => {
    const key = userKey.toLowerCase().trim();
    if (!statMap[key]) {
      statMap[key] = {
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
        completedRevenue: 0,
        pendingRevenue: 0,
      };
    }
    return statMap[key];
  };

  // If live orders are passed, compute strictly from live orders
  if (orders && orders.length > 0) {
    const liveOrderIds = new Set<number>();

    orders.forEach((o) => {
      liveOrderIds.add(o.id);
      let repUsername = orderUserMap.get(o.id);
      if (!repUsername) {
        const meta = o.meta_data?.find(
          (m: { key: string; value?: unknown }) =>
            m.key === "_sales_rep_username" ||
            m.key === "_created_by" ||
            m.key === "sales_rep"
        );
        if (meta && typeof meta.value === "string") {
          repUsername = meta.value.toLowerCase().trim();
        }
      }

      if (repUsername) {
        const s = getOrCreate(repUsername);
        const total = parseFloat(o.total) || 0;
        const isCompleted = o.status === "completed";
        const isCancelled =
          o.status === "cancelled" ||
          o.status === "failed" ||
          o.status === "refunded" ||
          o.status === "trash";

        s.totalOrders += 1;

        if (isCompleted) {
          s.completedOrders += 1;
          s.completedRevenue += total;
        } else if (!isCancelled) {
          s.pendingOrders += 1;
          s.pendingRevenue += total;
        } else {
          s.cancelledOrders += 1;
        }

        s.totalRevenue = s.completedRevenue;

        const dateStr = o.date_created || new Date().toISOString();
        if (!s.lastOrderAt || new Date(dateStr) > new Date(s.lastOrderAt)) {
          s.lastOrderAt = dateStr;
        }
      }
    });

    // Clean up stale order logs that were deleted from WooCommerce
    const cleanedLogs = logs.filter((log) => liveOrderIds.has(log.orderId));
    if (cleanedLogs.length !== logs.length) {
      inMemoryOrderLogs = cleanedLogs;
      try {
        fs.writeFileSync(ORDERS_LOG_FILE, JSON.stringify(cleanedLogs, null, 2), "utf-8");
      } catch {
        // Ignore
      }
      syncMetadataToWooCommerce(WC_ORDERS_META_KEY, JSON.stringify(cleanedLogs));
    }
  } else if (!orders || orders.length === 0) {
    // 0 orders in store -> reset all logs if store has 0 orders
    if (inMemoryOrderLogs.length > 0) {
      inMemoryOrderLogs = [];
      try {
        fs.writeFileSync(ORDERS_LOG_FILE, "[]", "utf-8");
      } catch {
        // Ignore
      }
      syncMetadataToWooCommerce(WC_ORDERS_META_KEY, "[]");
    }
  }

  const salesRepsStats: SalesRepStat[] = staffUsers.map((u: SystemUser) => {
    const s = statMap[u.username.toLowerCase()] || {
      totalOrders: 0,
      completedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      totalRevenue: 0,
      completedRevenue: 0,
      pendingRevenue: 0,
    };
    return {
      id: u.id,
      name: u.name || u.username,
      username: u.username,
      email: u.email,
      role: u.role,
      totalOrders: s.totalOrders,
      completedOrders: s.completedOrders,
      pendingOrders: s.pendingOrders,
      cancelledOrders: s.cancelledOrders,
      totalRevenue: s.completedRevenue,
      completedRevenue: s.completedRevenue,
      pendingRevenue: s.pendingRevenue,
      lastOrderAt: s.lastOrderAt,
    };
  });

  const onlyStaff = salesRepsStats.filter((u: SalesRepStat) => u.role === "staff");
  const totalSalesReps = onlyStaff.length;

  return {
    salesRepsStats,
    totalSalesReps,
    allStaffStats: statMap,
  };
}

export const MASTER_ADMIN_PASSCODE = "Store ERP@Admin2026#";

export const CORE_ADMIN_USERS: SystemUser[] = [
  {
    id: "usr_demo-store_admin",
    name: "Store Admin ERPistrator",
    email: "admin@itsemranraj.com/sss",
    username: "demo-store_admin",
    passwordHash: hashPassword("Store ERP@2026#Admin!"),
    role: "admin",
    createdAt: "2026-08-14T10:00:00.000Z",
  },
  {
    id: "usr_itsemranraj",
    name: "Emran Raj",
    email: "itsemranraj@gmail.com",
    username: "itsemranraj",
    passwordHash: hashPassword("Kajol4426@#$%"),
    role: "admin",
    createdAt: "2026-08-14T13:00:00.000Z",
  },
  {
    id: "usr_prince_4426",
    name: "Raihan Raj",
    email: "pricekajol4426@gmail.com",
    username: "prince4426",
    passwordHash: hashPassword("Prince4426*£$%"),
    role: "admin",
    createdAt: "2026-08-14T12:50:00.000Z",
  },
];

export const SEED_USERS: SystemUser[] = [...CORE_ADMIN_USERS];

// Master in-memory user database for serverless instances
let inMemoryUsers: SystemUser[] = [...CORE_ADMIN_USERS];
let isLoaded = false;

const TMP_FILE = path.join(os.tmpdir(), "demo-store_users.json");

function sanitizeUserList(list: SystemUser[]): SystemUser[] {
  return list
    .filter((u) => {
      if (!u || !u.username) return false;
      return true;
    })
    .map((u) => {
      const lower = u.username.toLowerCase().trim();
      // Ensure the core administrators are strictly role: "admin"
      if (
        lower === "itsemranraj" ||
        lower === "demo-store_admin" ||
        lower === "prince4426" ||
        lower === "demo-store" ||
        lower === "admin"
      ) {
        return { ...u, role: "admin" as const };
      }
      return u;
    });
}

function loadUsers(): SystemUser[] {
  // 1. Check if already loaded in memory
  if (isLoaded && inMemoryUsers.length > 0) {
    return sanitizeUserList(inMemoryUsers);
  }

  // 2. Try reading from writable tmp cache file
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, "utf-8");
      const list = JSON.parse(raw) as SystemUser[];
      if (Array.isArray(list) && list.length > 0) {
        inMemoryUsers = sanitizeUserList(list);
        isLoaded = true;
        return inMemoryUsers;
      }
    }
  } catch {
    // ignore
  }

  inMemoryUsers = [...CORE_ADMIN_USERS];
  isLoaded = true;
  return inMemoryUsers;
}

let lastCloudFetchTime = 0;
const CLOUD_CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export async function fetchUsersFromCloud(force: boolean = false): Promise<SystemUser[]> {
  const now = Date.now();
  if (!force && now - lastCloudFetchTime < CLOUD_CACHE_TTL_MS && inMemoryUsers.length > 0) {
    return sanitizeUserList(inMemoryUsers);
  }

  try {
    const customerId = await getOrCreateMetadataCustomerId();
    if (!customerId) return getAllUsers();

    const res = await fetch(`${getWcBaseUrl()}/customers/${customerId}`, {
      headers: {
        Authorization: getWcAuthHeader(),
        "User-Agent": "StoreERP/1.0",
      },
      cache: "no-store",
    });

    if (res.ok) {
      lastCloudFetchTime = Date.now();
      const customer = await res.json();
      if (customer && Array.isArray(customer.meta_data)) {
        const meta = customer.meta_data.find((m: { key: string; value: unknown }) => m.key === WC_USERS_META_KEY);
        if (meta && typeof meta.value === "string") {
          try {
            const cloudUsers = JSON.parse(meta.value) as SystemUser[];
            if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
              inMemoryUsers = sanitizeUserList(cloudUsers);
              isLoaded = true;
              try {
                fs.writeFileSync(TMP_FILE, JSON.stringify(inMemoryUsers, null, 2), "utf-8");
              } catch {
                // Ignore
              }
              return inMemoryUsers;
            }
          } catch {
            // Ignore parse errors
          }
        }

        const ordersMeta = customer.meta_data.find((m: { key: string; value: unknown }) => m.key === WC_ORDERS_META_KEY);
        if (ordersMeta && typeof ordersMeta.value === "string") {
          try {
            const cloudOrders = JSON.parse(ordersMeta.value) as UserOrderLog[];
            if (Array.isArray(cloudOrders)) {
              inMemoryOrderLogs = cloudOrders;
              isOrdersLoaded = true;
              try {
                fs.writeFileSync(ORDERS_LOG_FILE, JSON.stringify(cloudOrders, null, 2), "utf-8");
              } catch {
                // Ignore
              }
            }
          } catch {
            // Ignore
          }
        }

        return sanitizeUserList(inMemoryUsers);
      }
    }
  } catch {
    // Non-blocking
  }
  return getAllUsers();
}

async function persistUsers(users: SystemUser[]): Promise<boolean> {
  const sanitized = sanitizeUserList(users);
  inMemoryUsers = sanitized;
  isLoaded = true;
  lastCloudFetchTime = Date.now();
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(sanitized, null, 2), "utf-8");
  } catch {
    // Safe: in-memory state will remain active
  }
  await syncMetadataToWooCommerce(WC_USERS_META_KEY, JSON.stringify(sanitized));
  return true;
}

export function getAllUsers(): SystemUser[] {
  return sanitizeUserList(loadUsers());
}

export function findUserByUsernameOrEmail(identifier: string): SystemUser | null {
  const users = getAllUsers();
  const clean = (identifier || "").trim().toLowerCase();
  return users.find((u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean) || null;
}

export async function createSystemUser(params: {
  name: string;
  email: string;
  username: string;
  password: string;
  role?: "admin" | "manager" | "staff";
}): Promise<SystemUser> {
  await fetchUsersFromCloud();
  const users = getAllUsers();
  const cleanUsername = params.username.trim().toLowerCase();
  const cleanEmail = params.email.trim().toLowerCase();

  // Check unique against current list
  const exists = users.some(
    (u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail
  );

  if (exists) {
    const index = users.findIndex(
      (u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail
    );
    if (index !== -1) {
      users[index].passwordHash = hashPassword(params.password);
      users[index].name = params.name.trim();
      users[index].role = params.role || users[index].role;
      await persistUsers(users);
      return users[index];
    }
  }

  const newUser: SystemUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: params.name.trim(),
    email: cleanEmail,
    username: cleanUsername,
    passwordHash: hashPassword(params.password),
    role: params.role || "admin",
    createdAt: new Date().toISOString(),
  };

  const updatedUsers = [...users, newUser];
  await persistUsers(updatedUsers);

  return newUser;
}

export function verifyUserCredentials(identifier: string, passwordAttempt: string): SystemUser | null {
  const cleanId = (identifier || "").trim().toLowerCase();
  const cleanPass = (passwordAttempt || "").trim();

  // 1. Universal Store ERP Master Administrator match
  if (
    (cleanId === "admin" ||
      cleanId === "demo-store_admin" ||
      cleanId === "demo-store" ||
      cleanId === "admin@demo.local" ||
      cleanId === "admin@itsemranraj.com/sss" ||
      cleanId === "demo-store@gmail.com") &&
    (cleanPass === "admin123" ||
      cleanPass === "DemoMaster2026!#" ||
      cleanPass === "Store ERP@2026#Admin!" ||
      cleanPass === "Store ERP2026" ||
      cleanPass === process.env.ADMIN_PASSWORD)
  ) {
    return {
      id: "usr_demo_admin",
      name: "Demo Administrator",
      email: "admin@demo.local",
      username: "admin",
      passwordHash: hashPassword("admin123"),
      role: "admin",
      createdAt: "2026-08-14T10:00:00.000Z",
    };
  }

  // 1.1 Universal Sales Representative Demo match
  if (
    (cleanId === "salesrep" ||
      cleanId === "sales" ||
      cleanId === "sales@demo.local" ||
      cleanId === "demo_sales") &&
    (cleanPass === "sales123" ||
      cleanPass === "DemoSales2026!#" ||
      cleanPass === "salesrep123" ||
      cleanPass === "Sales123!")
  ) {
    return {
      id: "usr_demo_salesrep",
      name: "Demo Sales Rep",
      email: "sales@demo.local",
      username: "salesrep",
      passwordHash: hashPassword("sales123"),
      role: "staff",
      createdAt: "2026-08-14T10:00:00.000Z",
    };
  }

  // 2. Universal itsemranraj credentials match
  if (
    cleanId === "itsemranraj@gmail.com" ||
    cleanId === "itsemranraj" ||
    cleanId === "emran" ||
    cleanId === "emranraj"
  ) {
    if (
      cleanPass === "Kajol4426@#$%" ||
      cleanPass === "Kajol4426#$@%" ||
      cleanPass === "kajol4426@#$%" ||
      cleanPass === "Kajol4426" ||
      cleanPass.includes("Kajol4426") ||
      cleanPass.includes("kajol4426")
    ) {
      return SEED_USERS[1];
    }
  }

  // 3. Universal Prince / Raihan credentials match
  if (
    cleanId === "prince4426" ||
    cleanId === "raihan321" ||
    cleanId === "pricekajol4426@gmail.com" ||
    cleanId === "raihan raj"
  ) {
    if (
      cleanPass === "Prince4426*£$%" ||
      cleanPass === "raihan4426*£$%" ||
      cleanPass === "Prince4426" ||
      cleanPass.includes("Prince4426") ||
      cleanPass.includes("raihan4426")
    ) {
      return SEED_USERS[2];
    }
  }

  // 4. Dynamic Registered User check
  const user = findUserByUsernameOrEmail(identifier);
  if (user) {
    const attemptedHash = hashPassword(cleanPass);
    if (user.passwordHash === attemptedHash || user.passwordHash === hashPassword(passwordAttempt)) {
      return user;
    }
  }

  return null;
}

export async function updateSystemUserPassword(identifier: string, newPassword: string): Promise<boolean> {
  await fetchUsersFromCloud();
  const users = getAllUsers();
  const clean = (identifier || "").trim().toLowerCase();
  const userIndex = users.findIndex(
    (u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
  );

  if (userIndex === -1) {
    if (clean === "admin" || clean === "admin@itsemranraj.com/sss") {
      SEED_USERS[0].passwordHash = hashPassword(newPassword);
      await persistUsers([...users, SEED_USERS[0]]);
      return true;
    }
    if (clean === "itsemranraj@gmail.com" || clean === "itsemranraj") {
      SEED_USERS[1].passwordHash = hashPassword(newPassword);
      await persistUsers([...users, SEED_USERS[1]]);
      return true;
    }
    if (clean === "prince4426" || clean === "pricekajol4426@gmail.com") {
      SEED_USERS[2].passwordHash = hashPassword(newPassword);
      await persistUsers([...users, SEED_USERS[2]]);
      return true;
    }
    return false;
  }

  users[userIndex].passwordHash = hashPassword(newPassword);
  await persistUsers([...users]);

  return true;
}

export async function deleteSystemUser(id: string): Promise<boolean> {
  const cleanTarget = (id || "").trim().toLowerCase();

  // Prevent deleting default main admin accounts
  const protectedIds = [
    "usr_admin_default",
    "usr_itsemranraj",
    "usr_demo-store_admin",
    "usr_prince_4426",
    "admin",
    "demo-store_admin",
    "itsemranraj",
    "prince4426",
  ];

  if (protectedIds.includes(cleanTarget)) {
    return false;
  }

  const users = getAllUsers();
  const filtered = users.filter(
    (u) => u.id.toLowerCase() !== cleanTarget && u.username.toLowerCase() !== cleanTarget
  );

  await persistUsers(filtered);
  return true;
}
