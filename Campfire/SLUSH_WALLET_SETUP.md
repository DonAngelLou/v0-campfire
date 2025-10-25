# Slush Wallet Integration Setup Guide

This guide will help you set up and test the Slush Wallet integration in Campfire.

## Prerequisites

1. **Install Slush Wallet Extension**
   - Chrome: [Slush Wallet Chrome Extension](https://chromewebstore.google.com/detail/slush-wallet/djhndcmkdfdlkfkfbkbcfbfkfkfkfkfk)
   - Firefox: [Slush Wallet Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/slush-wallet/)

2. **Create a SUI Wallet**
   - Open the Slush Wallet extension
   - Create a new wallet or import an existing one
   - Save your recovery phrase securely

## Environment Setup

1. **Configure Network**
   
   Add to your `.env.local` file:
   \`\`\`bash
   NEXT_PUBLIC_SUI_NETWORK=testnet
   \`\`\`
   
   Options:
   - `testnet` - For development and testing (recommended)
   - `mainnet` - For production use

2. **Get Testnet SUI Tokens** (if using testnet)
   - Visit [SUI Testnet Faucet](https://faucet.testnet.sui.io/)
   - Enter your wallet address
   - Request testnet tokens

## Database Migration

Run the SQL migration to add SUI wallet columns:

\`\`\`bash
# The migration script is located at: scripts/add-sui-wallet-columns.sql
# Run it in your Supabase SQL editor or via CLI
\`\`\`

This adds:
- `sui_wallet_address` column (unique, nullable)
- `wallet_type` column (default: 'slush')
- Index for faster lookups

## Testing the Integration

### 1. Connect Wallet
1. Navigate to `/login`
2. Click "Connect Wallet" button
3. Slush Wallet popup will appear
4. Select your wallet and approve connection

### 2. Create Account
1. After connecting, if you're a new user, you'll see the account creation form
2. Fill in:
   - Display Name (required)
   - Bio (optional)
   - Profile Picture (optional)
3. Click "Create Account"
4. You'll be redirected to your profile

### 3. Verify Authentication
- Your SUI wallet address is stored in `sui_wallet_address` column
- Old `wallet_address` column is kept for backward compatibility
- Session is stored in localStorage as `campfire_sui_wallet`

## Network Switching

To switch between testnet and mainnet:

1. Update `.env.local`:
   \`\`\`bash
   NEXT_PUBLIC_SUI_NETWORK=mainnet
   \`\`\`

2. Restart your development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Ensure your Slush Wallet is connected to the same network

## Troubleshooting

### Wallet Not Connecting
- Ensure Slush Wallet extension is installed and unlocked
- Check that you're on the correct network (testnet/mainnet)
- Try refreshing the page

### Account Creation Fails
- Verify database migration was successful
- Check Supabase connection in browser console
- Ensure `sui_wallet_address` column exists

### Network Mismatch
- Slush Wallet network must match `NEXT_PUBLIC_SUI_NETWORK`
- Switch network in Slush Wallet settings

## Features Implemented

✅ Wallet connection with Slush Wallet
✅ Account creation with SUI addresses
✅ Testnet/Mainnet support via environment variable
✅ Backward compatibility with old wallet_address column
✅ Automatic authentication on wallet connect
✅ Profile redirect after successful login

## Next Steps (Future Phases)

- [ ] Signature verification for enhanced security
- [ ] NFT minting on SUI blockchain
- [ ] On-chain badge verification
- [ ] Transaction signing for badge awards

## Support

For issues or questions:
- Check browser console for error messages
- Verify environment variables are set correctly
- Ensure Slush Wallet is properly configured
