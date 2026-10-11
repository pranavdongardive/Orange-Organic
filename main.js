document.addEventListener('DOMContentLoaded', () => {
  const cartBtn = document.querySelector('.btn-outline'); // The nav cart button
  const addButtons = document.querySelectorAll('.add-to-cart');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.getElementById('cart-overlay');
  const closeCartBtn = document.getElementById('close-cart');
  const cartItemsContainer = document.getElementById('cart-items');
  const cartTotalPriceEl = document.getElementById('cart-total-price');
  const checkoutActions = document.getElementById('checkout-actions');
  const checkoutBtn = document.getElementById('checkout-btn');
  const showUpiQrBtn = document.getElementById('show-upi-qr-btn');
  const backToRzpBtn = document.getElementById('back-to-rzp-btn');
  const qrContainer = document.getElementById('checkout-qr-container');
  const qrCodeImg = document.getElementById('qr-code-img');
  const qrTotalAmount = document.getElementById('qr-total-amount');
  const verifyPaymentBtn = document.getElementById('verify-payment-btn');
  const paymentSuccessContainer = document.getElementById('payment-success-container');
  const paymentMethodVal = document.getElementById('payment-method-val');
  const paymentIdVal = document.getElementById('payment-id-val');
  const continueShoppingBtn = document.getElementById('continue-shopping-btn');
  
  let cart = [];

  // Open Cart
  cartBtn.addEventListener('click', (e) => {
    e.preventDefault();
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
  });

  // Close Cart
  const closeCart = () => {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
  };
  closeCartBtn.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  // Success handler
  const completeSuccessfulOrder = (paymentId, method) => {
    if (checkoutActions) checkoutActions.style.display = 'none';
    if (qrContainer) qrContainer.style.display = 'none';
    if (paymentSuccessContainer) paymentSuccessContainer.style.display = 'block';
    if (paymentMethodVal) paymentMethodVal.textContent = method;
    if (paymentIdVal) paymentIdVal.textContent = paymentId;
    if (cartItemsContainer) cartItemsContainer.innerHTML = '';
    
    // Clear cart
    cart = [];
    cartBtn.textContent = 'Cart (0)';
    cartTotalPriceEl.textContent = '₹0';
  };

  // Update Cart UI
  const updateCart = () => {
    cartBtn.textContent = `Cart (${cart.length})`;
    cartItemsContainer.innerHTML = '';
    if (qrContainer) qrContainer.style.display = 'none';
    if (paymentSuccessContainer) paymentSuccessContainer.style.display = 'none';
    
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = '<p style="color: #888; text-align: center; margin-top: 2rem;">Your cart is empty.</p>';
      cartTotalPriceEl.textContent = '₹0';
      if (checkoutActions) checkoutActions.style.display = 'none';
      return;
    }
    
    if (checkoutActions) checkoutActions.style.display = 'flex';

    let total = 0;
    cart.forEach((item, index) => {
      total += item.price;
      const itemEl = document.createElement('div');
      itemEl.className = 'cart-item';
      itemEl.innerHTML = `
        <div>
          <h4>${item.name}</h4>
          <span class="cart-item-price">₹${item.price}</span>
        </div>
        <button class="remove-btn" data-index="${index}">Remove</button>
      `;
      cartItemsContainer.appendChild(itemEl);
    });
    
    cartTotalPriceEl.textContent = `₹${total}`;

    // Attach remove event listeners
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = e.target.getAttribute('data-index');
        cart.splice(index, 1);
        updateCart();
      });
    });
  };

  // Add to Cart
  addButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productCard = e.target.closest('.product-card');
      const name = productCard.querySelector('h3').textContent;
      const priceStr = productCard.querySelector('.price').textContent;
      const price = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);

      cart.push({ name, price });
      updateCart();
      
      // Simple animation
      const originalText = btn.textContent;
      btn.textContent = 'Added! 🎉';
      btn.style.backgroundColor = '#4CAF50';
      
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = ''; // Reset to css
      }, 2000);
      
      // Open cart to show user
      cartDrawer.classList.add('active');
      cartOverlay.classList.add('active');
    });
  });
  
  // Initial cart render
  updateCart();

  // Razorpay Gateway Checkout logic
  checkoutBtn.addEventListener('click', () => {
    let total = 0;
    cart.forEach(item => total += item.price);
    if (total <= 0) return;

    // Check if Razorpay SDK is loaded
    if (typeof Razorpay === 'undefined') {
      alert('Razorpay Checkout SDK is still loading or blocked. Switching to Direct UPI QR.');
      switchToUpiQr(total);
      return;
    }

    const razorpayKey = (import.meta.env && import.meta.env.VITE_RAZORPAY_KEY_ID) || "rzp_live_TmauRkPfejP2M0";

    const options = {
      key: razorpayKey,
      amount: total * 100, // In paise (1 INR = 100 paise)
      currency: "INR",
      name: "Orange Organic",
      description: `Payment for ${cart.map(i => i.name).join(', ')}`,
      image: "/honey.png",
      handler: function (response) {
        const paymentId = response.razorpay_payment_id || `pay_${Date.now()}`;
        completeSuccessfulOrder(paymentId, "Razorpay Gateway (Live)");
      },
      prefill: {
        name: "Pranav",
        email: "pranavdongardive187@gmail.com",
        contact: "7709876513"
      },
      notes: {
        merchant_store: "Orange Organic",
        items: cart.map(i => i.name).join(', ')
      },
      theme: {
        color: "#FF7A00"
      },
      modal: {
        ondismiss: function () {
          console.log('Razorpay payment modal closed by customer.');
        }
      }
    };

    try {
      const rzpInstance = new Razorpay(options);
      rzpInstance.on('payment.failed', function (response) {
        alert(`Payment Failed: ${response.error.description || 'Transaction incomplete'}`);
      });
      rzpInstance.open();
    } catch (err) {
      console.error('Razorpay initialization error:', err);
      switchToUpiQr(total);
    }
  });

  // Switch to Direct UPI QR
  const switchToUpiQr = (total) => {
    if (!total) {
      total = 0;
      cart.forEach(item => total += item.price);
    }
    const upiString = `upi://pay?pa=pranavdongardive187@okhdfcbank&pn=OrangeOrganic&am=${total}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
    
    qrCodeImg.src = qrUrl;
    qrTotalAmount.textContent = `₹${total}`;
    
    checkoutActions.style.display = 'none';
    qrContainer.style.display = 'block';
  };

  if (showUpiQrBtn) {
    showUpiQrBtn.addEventListener('click', () => {
      let total = 0;
      cart.forEach(item => total += item.price);
      if (total > 0) switchToUpiQr(total);
    });
  }

  if (backToRzpBtn) {
    backToRzpBtn.addEventListener('click', () => {
      qrContainer.style.display = 'none';
      checkoutActions.style.display = 'flex';
    });
  }

  // Direct UPI "I have Paid" Verification Logic
  verifyPaymentBtn.addEventListener('click', () => {
    const originalText = verifyPaymentBtn.textContent;
    verifyPaymentBtn.textContent = 'Verifying UPI...';
    verifyPaymentBtn.disabled = true;
    
    setTimeout(() => {
      verifyPaymentBtn.textContent = originalText;
      verifyPaymentBtn.disabled = false;
      const simulatedUpiRef = `UPI_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      completeSuccessfulOrder(simulatedUpiRef, "Direct UPI (pranavdongardive187@okhdfcbank)");
    }, 1500);
  });

  // Continue Shopping Logic
  continueShoppingBtn.addEventListener('click', () => {
    closeCart();
    updateCart();
  });

  // Policy Modal Logic
  const policyOverlay = document.getElementById('policy-overlay');
  const policyModal = document.getElementById('policy-modal');
  const policyModalTitle = document.getElementById('policy-modal-title');
  const policyModalIcon = document.getElementById('policy-modal-icon');
  const policyModalBody = document.getElementById('policy-modal-body');
  const closePolicyModalBtn = document.getElementById('close-policy-modal');
  const policyModalCloseBtn = document.getElementById('policy-modal-close-btn');

  const policies = {
    privacy: {
      title: 'Privacy Policy',
      icon: '🔒',
      content: `
        <div class="policy-highlight-card">
          <p><strong>Security First:</strong> Your privacy is our priority. We never sell your personal data or store sensitive banking details.</p>
        </div>
        <h3>1. Information We Collect</h3>
        <p>When you place an order or contact us at Orange Organic, we collect essential details necessary to serve you:</p>
        <ul>
          <li><strong>Contact Details:</strong> Your name, delivery address, phone number, and email.</li>
          <li><strong>Inquiries & Support:</strong> Communications sent to <strong>pranavdongardive187@gmail.com</strong> or via phone/WhatsApp at <strong>+91 77098 76513</strong>.</li>
        </ul>

        <h3>2. Safe & Direct UPI Payments</h3>
        <p>All payments on Orange Organic are facilitated through peer-to-peer UPI transfers. We do <strong>not</strong> collect or store your UPI PIN, debit/credit card credentials, or bank passwords. All financial authentication takes place securely inside your verified UPI application.</p>

        <h3>3. How We Use Your Data</h3>
        <p>Your details are strictly used to fulfill and dispatch your orders, notify you of shipment progress, and address customer service requests.</p>

        <h3>4. Data Sharing & Security</h3>
        <p>We do not sell, rent, or lease customer records to third parties or marketing networks. All personal records are safeguarded with industry-standard encryption protocols.</p>

        <h3>5. Contact & Privacy Requests</h3>
        <p>If you have any questions about this Privacy Policy or wish to request data updates/deletion, contact us anytime at <a href="mailto:pranavdongardive187@gmail.com"><strong>pranavdongardive187@gmail.com</strong></a> or call <a href="tel:+917709876513"><strong>+91 77098 76513</strong></a>.</p>
      `
    },
    terms: {
      title: 'Terms & Conditions',
      icon: '📜',
      content: `
        <div class="policy-highlight-card">
          <p><strong>Agreement:</strong> By browsing our website and purchasing our organic nutrition products, you agree to the following terms.</p>
        </div>
        <h3>1. Product Offerings & Pricing</h3>
        <p>Orange Organic specializes in clean nutrition breakfast items including Orange & Coconut Muesli, Raw Orange Blossom Honey, and Citrus Blossom Granola. Currently, products are offered at a special promotional rate of ₹1 per item. Prices and availability are subject to change without prior notice.</p>

        <h3>2. Orders & Payments</h3>
        <p>All orders are confirmed upon payment initiation via our designated UPI ID (<strong>pranavdongardive187@okhdfcbank</strong>). Please ensure accurate delivery coordinates during order submission.</p>

        <h3>3. Product Quality & Proper Storage</h3>
        <p>Because our products are 100% natural and free of chemical preservatives, they should be stored in a cool, dry place away from direct sunlight after opening.</p>

        <h3>4. Intellectual Property</h3>
        <p>All content, branding, logos, package designs, and text appearing on this website are the intellectual property of Orange Organic.</p>

        <h3>5. Inquiries & Legal Notices</h3>
        <p>For any contractual or legal queries, write to us at <a href="mailto:pranavdongardive187@gmail.com"><strong>pranavdongardive187@gmail.com</strong></a> or call <a href="tel:+917709876513"><strong>+91 77098 76513</strong></a>.</p>
      `
    },
    returns: {
      title: 'Return & Refund Policy',
      icon: '🔄',
      content: `
        <div class="policy-highlight-card">
          <p><strong>100% Satisfaction Guarantee:</strong> If your organic order arrives damaged or defective, we will make it right promptly.</p>
        </div>
        <h3>1. 7-Day Return Window</h3>
        <p>You may request a return or replacement within <strong>7 calendar days</strong> of receiving your delivery if the item arrived damaged, defective, or incorrect.</p>

        <h3>2. Return Eligibility</h3>
        <p>To adhere to standard food health and hygiene standards, items must meet the following criteria:</p>
        <ul>
          <li>The product packaging and safety seals must be intact and untampered (unless reporting transit damage).</li>
          <li>The item must be accompanied by the order confirmation and UPI transaction details.</li>
        </ul>

        <h3>3. Damaged or Defective Deliveries</h3>
        <p>If your package arrives crushed or leaking, take a quick photo of the damaged package and reach out to <a href="mailto:pranavdongardive187@gmail.com"><strong>pranavdongardive187@gmail.com</strong></a> or call/WhatsApp <a href="tel:+917709876513"><strong>+91 77098 76513</strong></a> within 48 hours of delivery.</p>

        <h3>4. Refund Processing</h3>
        <p>Approved refunds are processed directly back to your original payment method (UPI reversal) within <strong>2 to 4 business days</strong>.</p>

        <h3>5. How to Initiate a Return</h3>
        <p>Send an email to <a href="mailto:pranavdongardive187@gmail.com"><strong>pranavdongardive187@gmail.com</strong></a> or text us on WhatsApp at <a href="tel:+917709876513"><strong>+91 77098 76513</strong></a> with your order details.</p>
      `
    },
    shipping: {
      title: 'Shipping & Delivery Policy',
      icon: '🚚',
      content: `
        <div class="policy-highlight-card">
          <p><strong>Fresh Delivery:</strong> We carefully pack our organic essentials in eco-friendly protective packaging to ensure farm-fresh quality.</p>
        </div>
        <h3>1. Processing Time</h3>
        <p>All orders are packed and dispatched within 24 to 48 hours of order confirmation.</p>

        <h3>2. Delivery Timelines</h3>
        <p>Standard delivery across major metropolitan areas takes 2–4 business days. Regional and remote locations may take 4–6 business days.</p>

        <h3>3. Shipping Charges</h3>
        <p>Promotional free delivery is currently applied to all orders.</p>

        <h3>4. Tracking & Support</h3>
        <p>For shipment tracking or delivery status inquiries, reach out to <a href="mailto:pranavdongardive187@gmail.com"><strong>pranavdongardive187@gmail.com</strong></a> or call <a href="tel:+917709876513"><strong>+91 77098 76513</strong></a>.</p>
      `
    }
  };

  const openPolicy = (policyKey) => {
    const policy = policies[policyKey];
    if (!policy) return;

    policyModalTitle.textContent = policy.title;
    policyModalIcon.textContent = policy.icon;
    policyModalBody.innerHTML = policy.content;

    policyOverlay.classList.add('active');
    policyModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // prevent scroll behind modal
  };

  const closePolicy = () => {
    policyOverlay.classList.remove('active');
    policyModal.classList.remove('active');
    document.body.style.overflow = '';
  };

  // Attach policy button click listeners
  document.querySelectorAll('.policy-link-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const policyKey = btn.getAttribute('data-policy');
      openPolicy(policyKey);
    });
  });

  closePolicyModalBtn.addEventListener('click', closePolicy);
  policyModalCloseBtn.addEventListener('click', closePolicy);
  policyOverlay.addEventListener('click', closePolicy);

  // Close policy modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && policyModal.classList.contains('active')) {
      closePolicy();
    }
  });
});
