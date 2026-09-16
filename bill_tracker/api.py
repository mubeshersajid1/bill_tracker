import frappe
from datetime import datetime
from frappe.utils import getdate, add_days

@frappe.whitelist()
def generate_monthly_bills(billing_month=None):
    """
    Generates pending Bill Payment records for all active categories.
    Example billing_month format: 'Sep-2026'
    """
    if not billing_month:
        billing_month = datetime.now().strftime("%b-%Y")

    # Set a default due date (10th of the billing month)
    try:
        parsed_date = datetime.strptime(billing_month, "%b-%Y")
        default_due_date = f"{parsed_date.year}-{parsed_date.month:02d}-10"
    except Exception:
        default_due_date = add_days(getdate(), 10)

    active_categories = frappe.get_all(
        "Bill Category",
        filters={"is_active": 1},
        fields=["name", "default_amount"]
    )

    created_count = 0
    skipped_count = 0

    for category in active_categories:
        doc_name = f"{category.name}-{billing_month}"
        if frappe.db.exists("Bill Payment", doc_name):
            skipped_count += 1
            continue

        payment = frappe.get_doc({
            "doctype": "Bill Payment",
            "bill_category": category.name,
            "billing_month": billing_month,
            "amount": category.default_amount or 0,
            "due_date": default_due_date,
            "status": "Pending"
        })
        payment.insert(ignore_permissions=True)
        created_count += 1

    frappe.db.commit()
    
    msg = f"Successfully created {created_count} bill payment(s) for {billing_month}. ({skipped_count} skipped)."
    frappe.msgprint(msg)
    return msg