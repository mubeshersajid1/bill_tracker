import frappe
from datetime import datetime


def execute(filters=None):
    columns = [
        {
            "label": "Customer",
            "fieldname": "customer_id",
            "fieldtype": "Link",
            "options": "Customers",
            "width": 180,
        },
    ]

    raw_invoices = frappe.get_all("Customer Invoice", fields=["invoice_date"], distinct=True)

    def parse_month(month):
        try:
            return datetime.strptime(month, "%b-%Y")
        except (TypeError, ValueError):
            return datetime.min

    months = sorted(
        {invoice.invoice_date.strftime("%b-%Y") for invoice in raw_invoices if invoice.invoice_date},
        key=parse_month,
    )

    for month in months:
        month_key = month.replace("-", "_").lower()
        columns.append({
            "label": f"<b>{month}</b>",
            "fieldname": month_key,
            "fieldtype": "Data",
            "width": 150,
        })

    customers = frappe.get_all("Customers", fields=["name", "customer_name"])
    invoices = frappe.get_all(
        "Customer Invoice",
        fields=[
            "name",
            "customer_id",
            "invoice_date",
            "invoice_total_amount",
            "invoice_paid_amount",
            "invoice_outstanding_amount",
            "status",
        ],
    )

    invoice_map = {
        (invoice.customer_id, invoice.invoice_date.strftime("%b-%Y")): invoice
        for invoice in invoices
        if invoice.customer_id and invoice.invoice_date
    }

    data = []
    for customer in customers:
        row = {
            "customer_id": customer.name,
            "customer_name": customer.customer_name,
            "is_summary": False,
        }
        has_pending = False
        has_entries = False

        for month in months:
            month_key = month.replace("-", "_").lower()
            invoice = invoice_map.get((customer.name, month))
            if invoice:
                has_entries = True
                row[f"doc_{month_key}"] = invoice.name
                row[month_key] = invoice.invoice_total_amount or 0
                row[f"date_{month_key}"] = invoice.invoice_date
                row[f"status_{month_key}"] = invoice.status or "Draft"
                row[f"paid_{month_key}"] = invoice.invoice_paid_amount or 0
                row[f"outstanding_{month_key}"] = invoice.invoice_outstanding_amount or 0

                if invoice.status != "Paid":
                    has_pending = True
            else:
                row[f"status_{month_key}"] = "-"

        if has_pending:
            row["overall_status"] = "Pending"
        elif has_entries:
            row["overall_status"] = "Paid"
        else:
            row["overall_status"] = "None"

        data.append(row)

    return columns, data
