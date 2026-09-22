import frappe
from datetime import datetime

def execute(filters=None):
    columns = [
        {"label": "Categories", "fieldname": "category", "fieldtype": "Data", "width": 180},
        {"label": "Bill #", "fieldname": "bill_number", "fieldtype": "Data", "width": 130},
    ]

    raw_months = frappe.get_all("Bill Payment", fields=["billing_month"], distinct=True)
    months_list = [m.billing_month for m in raw_months if m.billing_month]

    def parse_month(m_str):
        try:
            return datetime.strptime(m_str, "%b-%Y")
        except Exception:
            return datetime.min

    months = sorted(months_list, key=parse_month)

    for month in months:
        m_key = month.replace("-", "_").lower()
        columns.extend([
            {"label": f"<b>{month}</b>", "fieldname": f"{m_key}", "fieldtype": "Data", "width": 150},
            # {"label": f"<b>{month}</b><br><span style='font-size: 11px; color: #6b7280;'>Paid Date</span>", "fieldname": f"date_{m_key}", "fieldtype": "Date", "width": 110},
            # {"label": f"<b>{month}</b><br><span style='font-size: 11px; color: #6b7280;'>Status</span>", "fieldname": f"status_{m_key}", "fieldtype": "Data", "width": 100},
        ])

    categories = frappe.get_all("Bill Category", fields=["name", "bill_number"])
    payments = frappe.get_all("Bill Payment", fields=["name", "bill_category", "billing_month", "amount", "due_date", "paid_date", "status"])

    pay_map = {(p.bill_category, p.billing_month): p for p in payments}

    data = []
    pending_totals = {m: 0 for m in months}
    paid_totals = {m: 0 for m in months}

    for cat in categories:
        row = {
            "category": cat.name,
            "bill_number": cat.bill_number or "-",
            "is_summary": False
        }

        has_pending = False
        has_entries = False

        for month in months:
            m_key = month.replace("-", "_").lower()
            p = pay_map.get((cat.name, month))
            if p:
                has_entries = True
                row[f"doc_{m_key}"] = p.name  # Pass payment doc name for quick edit
                row[f"{m_key}"] = p.amount
                row[f"date_{m_key}"] = p.paid_date or p.due_date

                if p.status == "Paid":
                    # row[f"{m_key}"] = p.paid_date or p.due_date
                    paid_totals[month] += (p.amount or 0)
                else:
                    # row[f"{m_key}"] = None
                    pending_totals[month] += (p.amount or 0)
                    has_pending = True

                row[f"status_{m_key}"] = p.status
            else:
                # row[f"amount_{m_key}"] = 0
                # row[f"date_{m_key}"] = None
                row[f"status_{m_key}"] = "-"

        if has_pending:
            row["overall_status"] = "Pending"
        elif has_entries:
            row["overall_status"] = "Paid"
        else:
            row["overall_status"] = "None"

        data.append(row)

    if months:
        # data.append({"is_summary": False})  # Empty row for spacing
        row_pending = {"category": "Amount to Paid", "is_summary": False}
        row_paid = {"category": "Already Paid Amount", "is_summary": False}

        for month in months:
            m_key = month.replace("-", "_").lower()
            row_pending[f"amount_{m_key}"] = pending_totals[month]
            row_paid[f"amount_{m_key}"] = paid_totals[month]

        # data.append(row_pending)
        # data.append(row_paid)

    return columns, data