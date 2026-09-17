/** Order status values after which phones leave the shop */
export const SHIPPED_ORDER_STATUSES = ["shipped", "delivered"]

/** Delivery status values meaning the parcel left with the carrier or was delivered */
export const SHIPPED_DELIVERY_STATUSES = ["envois_recu", "suivi", "livre"]

/** True when a status change sends the order out (only when the value actually changes) */
export function isShippingChange(change: {
  status?: string | null
  previousStatus?: string | null
  deliveryStatus?: string | null
  previousDeliveryStatus?: string | null
}) {
  const statusShips =
    !!change.status &&
    change.status !== change.previousStatus &&
    SHIPPED_ORDER_STATUSES.includes(change.status)
  const deliveryShips =
    !!change.deliveryStatus &&
    change.deliveryStatus !== change.previousDeliveryStatus &&
    SHIPPED_DELIVERY_STATUSES.includes(change.deliveryStatus)
  return statusShips || deliveryShips
}
