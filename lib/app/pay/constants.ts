/**
 * What the public /pay/[token] page tells a customer. ALL OF THESE ARE
 * PLACEHOLDERS — fill them in before any pay link is sent to a customer.
 */

// TODO(Stephen): the email address or phone number Zelle payments go to.
export const ZELLE_HANDLE = "TODO-SET-ZELLE-HANDLE";

// TODO(Stephen): who checks are made out to, and where they're mailed.
export const CHECK_PAYEE = "Farrell Electric";
export const CHECK_MAILING_ADDRESS = ["TODO-SET-STREET-ADDRESS", "TODO-SET-CITY, FL ZIP"];

// TODO(Stephen): the lender's apply link. Until set, this is the site's own financing enquiry stub.
export const FINANCING_URL = "/contact?intent=financing";

/**
 * Card payments. OFF until Task 6 (QuickBooks) lights it up: flip this when
 * the QuickBooks invoice/payment-link flow exists. The page renders no card
 * section while it is false, and nothing here collects card data.
 */
export const PAY_CARD_ENABLED = false;
