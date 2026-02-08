// If using Supabase Edge Functions or a backend, create this:
// api/paystack-webhook.ts
import { subscriptionService } from '../services/subscriptionService';

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();
    
    // Verify webhook signature (Paystack sends a signature)
    const signature = req.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY;
    
    // Verify signature (pseudo-code)
    // const isValid = verifySignature(payload, signature, secret);
    // if (!isValid) return new Response('Invalid signature', { status: 401 });

    // Process webhook
    await subscriptionService.handlePaymentWebhook(payload);
    
    return new Response('Webhook processed', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error processing webhook', { status: 500 });
  }
}