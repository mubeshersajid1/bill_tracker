// Copyright (c) 2026, iTechStellar and contributors
// For license information, please see license.txt

frappe.ui.form.on('Customer Invoice', {
	refresh(frm) {
	    frm.trigger('calculate_totals');
	}
});

frappe.ui.form.on('Invoice Items', {
    item_qty(frm, cdt, cdn) {
        calculate_row_amount(cdt, cdn);
        frm.trigger('calculate_totals');
    },
    item_rate(frm, cdt, cdn) {
        calculate_row_amount(cdt, cdn);
        frm.trigger('calculate_totals');
    },
    invoice_items_remove(frm) {
        frm.trigger('calculate_totals');
    }
});

function calculate_row_amount(cdt, cdn) {
    let row = frappe.get_doc(cdt, cdn);
    frappe.model.set_value(cdt, cdn, 'item_amount', (row.item_qty || 0) * (row.item_rate || 0));
}

frappe.ui.form.on('Customer Invoice', {
    calculate_totals(frm) {
        let total = 0;
        (frm.doc.invoice_items || []).forEach(row => {
            total += (row.item_amount || 0);
        });
        frm.set_value('invoice_total_amount', total);
        frm.set_value('invoice_outstanding_amount', total - (frm.doc.invoice_paid_amount || 0));
    }
});
