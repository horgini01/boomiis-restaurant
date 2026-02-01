import PDFDocument from "pdfkit";
import { getDb } from "./db";
import { siteSettings, deliveryAreas } from "../drizzle/schema";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderReceiptData {
  orderId: string;
  orderNumber: string;
  orderDate: Date;
  orderType: "delivery" | "pickup";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress?: string;
  postcode?: string;
  scheduledFor?: Date;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentStatus: string;
}

export async function generateOrderReceiptPDF(
  orderData: OrderReceiptData
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database connection failed');
      }

      // Fetch restaurant settings
      const settingsRows = await db.select().from(siteSettings);
      const settingsMap: Record<string, string> = {};
      settingsRows.forEach((s: any) => {
        settingsMap[s.settingKey] = s.settingValue;
      });

      // Fetch delivery areas
      const areas = await db
        .select()
        .from(deliveryAreas)
        .orderBy(deliveryAreas.displayOrder);

      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header - Restaurant Name
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text(settingsMap.restaurant_name || "Boomiis Restaurant", {
          align: "center",
        });

      doc.moveDown(0.5);

      // Restaurant Contact Info
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          `${settingsMap.address || "123 High Street"} | ${settingsMap.phone || "+44 20 1234 5678"} | ${settingsMap.email || "hello@boomiis.uk"}`,
          { align: "center" }
        );

      doc.moveDown(1);

      // Receipt Title
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("ORDER RECEIPT", { align: "center" });

      doc.moveDown(1);

      // Order Info Section
      const startY = doc.y;
      doc.fontSize(10).font("Helvetica");

      // Left column
      doc.text(`Order Number: ${orderData.orderNumber}`, 50, startY);
      doc.text(
        `Order Date: ${orderData.orderDate.toLocaleDateString("en-GB")} ${orderData.orderDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
        50,
        doc.y
      );
      doc.text(
        `Order Type: ${orderData.orderType === "delivery" ? "Delivery" : "Pickup"}`,
        50,
        doc.y
      );

      // Right column - Payment Status
      doc.text(`Payment: ${orderData.paymentStatus}`, 350, startY, {
        width: 200,
        align: "right",
      });

      doc.moveDown(1.5);

      // Customer Information
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Customer Information", 50, doc.y);
      doc.moveDown(0.5);

      doc.fontSize(10).font("Helvetica");
      doc.text(`Name: ${orderData.customerName}`);
      doc.text(`Email: ${orderData.customerEmail}`);
      doc.text(`Phone: ${orderData.customerPhone}`);

      if (orderData.orderType === "delivery" && orderData.deliveryAddress) {
        doc.text(`Address: ${orderData.deliveryAddress}`);
        if (orderData.postcode) {
          doc.text(`Postcode: ${orderData.postcode}`);
        }
      }

      if (orderData.scheduledFor) {
        const scheduledTime = orderData.scheduledFor.toLocaleTimeString(
          "en-GB",
          { hour: "2-digit", minute: "2-digit" }
        );
        doc.text(
          `${orderData.orderType === "delivery" ? "Delivery Time" : "Pickup Time"}: ${scheduledTime}`
        );
      }

      doc.moveDown(1.5);

      // Order Items Table
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Order Details", 50, doc.y);
      doc.moveDown(0.5);

      // Table Header
      const tableTop = doc.y;
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Item", 50, tableTop);
      doc.text("Qty", 350, tableTop, { width: 50, align: "center" });
      doc.text("Price", 450, tableTop, { width: 100, align: "right" });

      // Draw line under header
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      // Table Items
      let itemY = tableTop + 25;
      doc.font("Helvetica");

      orderData.items.forEach((item) => {
        doc.text(item.name, 50, itemY, { width: 280 });
        doc.text(item.quantity.toString(), 350, itemY, {
          width: 50,
          align: "center",
        });
        doc.text(`£${item.price.toFixed(2)}`, 450, itemY, {
          width: 100,
          align: "right",
        });
        itemY += 20;
      });

      doc.moveDown(1);

      // Totals Section
      const totalsY = doc.y + 10;
      doc
        .moveTo(50, totalsY)
        .lineTo(550, totalsY)
        .stroke();

      doc.fontSize(10).font("Helvetica");
      doc.text("Subtotal:", 350, totalsY + 10);
      doc.text(`£${orderData.subtotal.toFixed(2)}`, 450, totalsY + 10, {
        width: 100,
        align: "right",
      });

      if (orderData.deliveryFee > 0) {
        doc.text("Delivery Fee:", 350, doc.y);
        doc.text(`£${orderData.deliveryFee.toFixed(2)}`, 450, doc.y, {
          width: 100,
          align: "right",
        });
      }

      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Total:", 350, doc.y + 5);
      doc.text(`£${orderData.total.toFixed(2)}`, 450, doc.y, {
        width: 100,
        align: "right",
      });

      doc.moveDown(2);

      // Footer Section
      const footerY = doc.page.height - 150;
      doc
        .moveTo(50, footerY)
        .lineTo(550, footerY)
        .stroke();

      doc.fontSize(10).font("Helvetica").text("", 50, footerY + 15);

      // Delivery Areas
      if (areas.length > 0) {
        const areasText = areas
          .filter((area: any) => area.postcodePrefixes)
          .map((area: any) => `${area.areaName} (${area.postcodePrefixes})`)
          .join(", ");
        if (areasText) {
          doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .text("We Deliver To:", { continued: true })
            .font("Helvetica")
            .text(` ${areasText}`, { width: 500 });
          doc.moveDown(0.5);
        }
      }

      // Opening Hours - Parse JSON if needed
      if (settingsMap.opening_hours) {
        let hoursText = settingsMap.opening_hours;
        try {
          // Try to parse as JSON
          const hoursObj = JSON.parse(settingsMap.opening_hours);
          // Format as readable text
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          hoursText = days
            .map(day => {
              const dayData = hoursObj[day];
              if (!dayData || dayData.closed) return null;
              const dayName = day.charAt(0).toUpperCase() + day.slice(1);
              return `${dayName}: ${dayData.open}-${dayData.close}`;
            })
            .filter(Boolean)
            .join(', ');
        } catch (e) {
          // If not JSON, use as-is
        }
        
        if (hoursText && hoursText.length > 0) {
          doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .text("Opening Hours:", { continued: true })
            .font("Helvetica")
            .text(` ${hoursText}`);
          doc.moveDown(0.5);
        }
      }

      // Thank You Message
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Thank you for your order!", { align: "center" });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
