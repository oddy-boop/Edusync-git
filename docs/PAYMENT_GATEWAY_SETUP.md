# Payment Gateway Setup Guide

## Overview
EduSync supports dual payment gateways to serve both local and international students:
- **Paystack**: For African markets (Nigeria, Ghana, South Africa, Kenya)
- **Stripe**: For international markets (US, Canada, UK, EU, Australia, etc.)

## Regional Availability

### Paystack (Recommended for African Schools)
✅ **Available in:**
- Nigeria (NGN)
- Ghana (GHS) 
- South Africa (ZAR)
- Kenya (KES)
- Also supports USD for international payments

✅ **Benefits:**
- Designed for African markets
- Lower transaction fees for local payments
- Mobile money integration
- Local banking partnerships
- Better conversion rates for local currencies

### Stripe (International Only)
❌ **NOT Available in:**
- Most African countries including Ghana, Nigeria, Kenya, South Africa
- Middle East and many developing countries

✅ **Available in:**
- United States, Canada
- United Kingdom, European Union
- Australia, Singapore
- 40+ developed countries

## Setup Instructions

### For Ghana-Based Schools (Recommended: Paystack Only)

Since you're located in Ghana, **we recommend using Paystack exclusively** as Stripe is not available in Ghana.

#### Paystack Setup:
1. Visit [paystack.com](https://paystack.com)
2. Create a business account with your school details
3. Complete business verification
4. Get your API keys from the dashboard
5. Add the keys to your admin settings:
   - **Paystack Public Key**: `pk_test_...` or `pk_live_...`
   - **Paystack Secret Key**: `sk_test_...` or `sk_live_...`

#### Admin Configuration:
1. Go to **Admin Settings** → **API Keys** tab
2. Fill in your Paystack credentials
3. Leave Stripe fields empty
4. Set **Preferred Gateway** to "Paystack"
5. Enable **Auto Split** for platform fees

### For International Schools

If your school is located in a Stripe-supported country, you can configure both gateways:

#### Dual Gateway Setup:
1. Set up Paystack for African students
2. Set up Stripe for international students
3. Students will automatically see the best option for their location

## Student Payment Experience

### Ghana-Based Students:
- Will see **Paystack only** (Stripe shows as "Not Available")
- Can pay in GHS (Ghana Cedis) or USD
- Mobile money and card payments supported

### International Students (US, Canada, Europe, etc.):
#### Option 1: USD via Paystack (Recommended for Ghana-based schools)
- 🌍 **Available worldwide** - Paystack accepts international USD payments
- 💳 **Credit/Debit cards** - Visa, Mastercard accepted globally  
- 💰 **Single currency** - Pay in USD regardless of student location
- 🏦 **No school setup needed** - Works with your existing Ghana Paystack account

#### Option 2: Local Currency via Stripe (If school has Stripe)
- 🌎 **Multiple currencies** - EUR, GBP, CAD, AUD, JPY
- 🏪 **Local processing** - Better rates for European/North American students
- ⚙️ **Requires setup** - School must have Stripe account in supported country

### How International Students Pay (Current System):

1. **Student selects country** (e.g., "United States", "Canada", "United Kingdom")
2. **System shows available options**:
   - ✅ **Paystack**: "International USD payments accepted" 
   - ❌ **Stripe**: "School hasn't configured Stripe yet" (if you haven't set it up)
3. **Student pays via Paystack in USD** using their international credit card
4. **Automatic conversion** - Their bank handles currency conversion to USD

### Sample Payment Flow for US Student:

```
🇺🇸 US Student → Selects "United States" → Sees "Paystack (Recommended)" 
→ Pays $500 USD → Uses Visa/Mastercard → Payment processed globally
```

## Supported Currencies

### Paystack (International Support):
- **Local African**: NGN, GHS, ZAR, KES  
- **International**: USD (accepted from any country) ← **Perfect for international students**

### Stripe (If Available):
- USD, EUR, GBP, CAD, AUD, JPY
- 135+ currencies supported

## Transaction Fees

### Paystack:
**Ghana/Local:**
- Local cards: 1.5% + GHS 0.50
- International cards: 3.9% + GHS 0.50
- Mobile money: 1% (MTN, Vodafone, AirtelTigo)

**International USD payments:**
- International cards: 3.9% + $0.50
- Processed globally via Paystack's international network

### Platform Fee:
- **2%** additional fee for platform maintenance
- Automatically calculated and displayed to students

### Example Fee Calculation for International Student:
```
School Fee: $1,000 USD
Platform Fee (2%): $20 USD  
Paystack Fee (3.9% + $0.50): $39.50 USD
Total Student Pays: $1,059.50 USD
```

## Testing

### Paystack Test Mode:
- Use test API keys during setup
- Test card: `4084084084084081`
- CVV: Any 3 digits
- Expiry: Any future date

## Frequently Asked Questions

### For International Students:

**Q: I'm from the US/Canada/Europe - can I pay school fees?**
- A: Yes! You can pay in USD via Paystack using any international Visa/Mastercard.

**Q: Do I need to convert my money to Ghana Cedis?**
- A: No! You can pay in USD. Your bank will handle the currency conversion automatically.

**Q: Will my international credit card work?**
- A: Yes! Paystack accepts Visa, Mastercard, and other major international cards globally.

**Q: What if I prefer to pay in my local currency (EUR, GBP, CAD)?**
- A: Currently, you can pay in USD via Paystack. If your school sets up Stripe, more currencies become available.

**Q: Are there extra fees for international payments?**
- A: Yes, Paystack charges 3.9% + $0.50 for international cards (vs 1.5% for local cards).

### For Schools:

**Q: How do we handle international students if we're in Ghana?**
- A: Use Paystack's international USD support. It accepts payments from students worldwide.

**Q: Do we need both Paystack AND Stripe?**
- A: No! Paystack alone can serve both local (Ghana) and international (USD) students.

**Q: Should we set USD or GHS as the fee currency?**
- A: You can offer both. Set fees in GHS for local students and USD equivalent for international students.

---

## Summary for Your Ghana-Based School:

### ✅ **Perfect Solution (No Stripe Needed):**

1. **Setup Paystack only** (you're in Ghana, so this works perfectly)
2. **Configure fees in both GHS and USD** 
3. **Local students** pay in GHS via Paystack
4. **International students** pay in USD via Paystack  
5. **Everyone can pay** - no students excluded!

### 📧 **Student Communication:**

Send this to your international students:
> "You can pay your school fees in USD using any international Visa or Mastercard. 
> When you access the payment portal, select 'United States' as your country and 
> 'USD' as currency. The system will guide you through the payment process via our 
> secure Paystack integration."

## Support

For payment gateway specific issues:
- **Paystack Support**: [support@paystack.com](mailto:support@paystack.com)
- **EduSync Platform**: Use the built-in AI assistant or admin support

## Security Notes

- Never share your secret keys
- Use test keys during development
- Enable webhook URLs for payment confirmations
- Regularly rotate API keys (recommended every 6 months)

---

**For Ghana-based schools**: Focus on Paystack setup only. Stripe fields can be left empty without affecting functionality.
