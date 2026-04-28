// Renders corridor-specific walkthrough content from compact data attributes.
(function attachWapiSeoFlowContent(global) {
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const parseOption = (value) => {
    const [country, currency, flag] = String(value || "").split("|");
    return { country, currency, flag };
  };

  const renderFlag = (flag) => `<span class="seo-flag seo-flag-${escapeHtml(flag)}" aria-hidden="true"></span>`;

  const renderRailMark = ({ railLogo, railIcon }) => {
    if (railLogo) {
      return `<img src="${escapeHtml(railLogo)}" alt="" loading="lazy" />`;
    }

    return `<span class="seo-flow-rail-mark seo-flow-rail-${escapeHtml(railIcon || "bank")}" aria-hidden="true"></span>`;
  };

  const renderChoice = ({ country, currency, flag }, isSelected = false) => `
    <div class="seo-flow-choice${isSelected ? " seo-flow-highlight" : ""}">
      ${renderFlag(flag)}
      <div>
        <strong>${escapeHtml(country)}</strong>
        <small>Receive in ${escapeHtml(currency)}</small>
      </div>
      <span>${isSelected ? "Selected" : "Available"}</span>
    </div>
  `;

  global.initWapiSeoFlowContent = function initWapiSeoFlowContent() {
    const templates = Array.from(document.querySelectorAll("[data-seo-flow-template]"));

    templates.forEach((section) => {
      const data = section.dataset;
      const country = data.flowCountry;
      const currency = data.flowCurrency;
      const flag = data.flowFlag;
      const routeName = data.flowRouteName || `Kenya to ${country}`;
      const sourceCurrency = data.flowSourceCurrency || "KES";
      const sourceFlag = data.flowSourceFlag || "ke";
      const sourceAmount = data.flowSourceAmount || "20,000";
      const sourceFee = data.flowSourceFee || `${sourceCurrency} 230.00`;
      const sourceTotal = data.flowSourceTotal || `${sourceCurrency} 20,230.00`;
      const sourceAvailable = data.flowSourceAvailable || `${sourceCurrency} 21,567.89 available`;
      const rate = data.flowRate;
      const recipientAmount = data.flowRecipientAmount;
      const recipientName = data.flowRecipientName || "Recipient";
      const railName = data.flowRailName || "Bank transfer";
      const railDetail = data.flowRailDetail || `Payout in ${country}`;
      const railLogo = data.flowRailLogo;
      const railIcon = data.flowRailIcon || "bank";
      const purpose = data.flowPurpose || "Personal transfer";
      const receiptStatus = data.flowReceiptStatus || "Completed";
      const receiptImage = data.flowReceiptImage;
      const choices = [
        { country, currency, flag },
        parseOption(data.flowOptionOne),
        parseOption(data.flowOptionTwo),
      ].filter((choice) => choice.country && choice.currency && choice.flag);
      const railMark = renderRailMark({ railLogo, railIcon });
      const receiptPanel = receiptImage
        ? `
              <article class="seo-flow-panel" data-flow-panel="receipt" aria-hidden="true">
                <figure class="seo-flow-receipt-screen">
                  <img
                    src="${escapeHtml(receiptImage)}"
                    alt="WapiPay successful transfer receipt screen"
                    width="191"
                    height="531"
                    decoding="async"
                    loading="lazy"
                  />
                </figure>
              </article>
            `
        : `
              <article class="seo-flow-panel" data-flow-panel="receipt" aria-hidden="true">
                <div class="seo-app-screen seo-flow-app-screen seo-flow-receipt-card">
                  <div class="seo-app-status" aria-hidden="true">
                    <span>9:41</span>
                    <span class="seo-app-indicators">
                      <span class="seo-app-signal"><i></i><i></i><i></i></span>
                      <span class="seo-app-wifi"></span>
                      <span class="seo-app-battery"></span>
                    </span>
                  </div>
                  <div class="seo-flow-success-mark" aria-hidden="true"></div>
                  <h3>Successful.</h3>
                  <p>${escapeHtml(sourceCurrency)} ${escapeHtml(sourceAmount)} has been sent to ${escapeHtml(recipientName)}.</p>
                  <div class="seo-app-breakdown seo-flow-highlight">
                    <div class="seo-app-detail"><span class="seo-app-detail-label">Status</span><strong>${escapeHtml(receiptStatus)}</strong></div>
                    <div class="seo-app-detail"><span class="seo-app-detail-label">Channel</span><strong>${escapeHtml(railName)}</strong></div>
                    <div class="seo-app-detail"><span class="seo-app-detail-label">Exchange rate</span><strong>${escapeHtml(rate)}</strong></div>
                    <div class="seo-app-detail"><span class="seo-app-detail-label">Recipient gets</span><strong>${escapeHtml(currency)} ${escapeHtml(recipientAmount)}</strong></div>
                  </div>
                  <span class="seo-app-button">Done</span>
                </div>
              </article>
            `;

      section.innerHTML = `
        <div class="seo-flow-intro">
          <p class="eyebrow">How to send</p>
          <h2><span class="text-reveal">Start from home. Confirm only when clear.</span></h2>
          <p class="seo-section-intro">
            Send from the WapiPay home screen, choose the destination, review the amount and delivery method, confirm recipient details, then approve with your PIN.
          </p>
        </div>

        <div class="seo-flow">
          <div class="seo-flow-steps" aria-label="Steps to send money on the ${escapeHtml(routeName)} route">
            <article class="seo-flow-step is-active" data-flow-step="home">
              <span class="seo-flow-step-number">01</span>
              <div>
                <p class="seo-flow-kicker">Start</p>
                <h3>Open WapiPay and tap Send.</h3>
                <p>Begin from the home screen where your balance, accounts, and send action are visible.</p>
              </div>
            </article>

            <article class="seo-flow-step" data-flow-step="route">
              <span class="seo-flow-step-number">02</span>
              <div>
                <p class="seo-flow-kicker">Destination</p>
                <h3>Select ${escapeHtml(country)} as the destination.</h3>
                <p>Choose where the money is going before the app shows the available payout route.</p>
              </div>
            </article>

            <article class="seo-flow-step" data-flow-step="amount">
              <span class="seo-flow-step-number">03</span>
              <div>
                <p class="seo-flow-kicker">Amount</p>
                <h3>Enter the amount and delivery method.</h3>
                <p>See what you send, what the recipient gets, and which rail will deliver the payout.</p>
              </div>
            </article>

            <article class="seo-flow-step" data-flow-step="recipient">
              <span class="seo-flow-step-number">04</span>
              <div>
                <p class="seo-flow-kicker">Details</p>
                <h3>Choose the recipient and funding account.</h3>
                <p>Add or select a recipient, then confirm the source account and purpose of remittance.</p>
              </div>
            </article>

            <article class="seo-flow-step" data-flow-step="confirm">
              <span class="seo-flow-step-number">05</span>
              <div>
                <p class="seo-flow-kicker">Review</p>
                <h3>Review everything, then enter your PIN.</h3>
                <p>Confirm only after the rate, fees, total debit, delivery method, and recipient are clear.</p>
              </div>
            </article>

            <article class="seo-flow-step" data-flow-step="receipt">
              <span class="seo-flow-step-number">06</span>
              <div>
                <p class="seo-flow-kicker">Receipt</p>
                <h3>Get the receipt.</h3>
                <p>Keep a clear record of the amount, delivery rail, status, and recipient payout.</p>
              </div>
            </article>
          </div>

          <aside class="seo-flow-stage" aria-label="WapiPay app send flow preview">
            <div class="seo-flow-phone">
              <article class="seo-flow-panel is-active" data-flow-panel="home" aria-hidden="false">
                <figure class="seo-flow-home-screen">
                  <img
                    src="../../assets/v4_homepage.PNG"
                    alt="WapiPay app home screen showing the Send action"
                    width="304"
                    height="644"
                    decoding="async"
                    loading="lazy"
                  />
                </figure>
              </article>

              <article class="seo-flow-panel" data-flow-panel="route" aria-hidden="true">
                <div class="seo-app-screen seo-flow-app-screen seo-flow-choice-screen">
                  <div class="seo-app-status" aria-hidden="true">
                    <span>9:41</span>
                    <span class="seo-app-indicators">
                      <span class="seo-app-signal"><i></i><i></i><i></i></span>
                      <span class="seo-app-wifi"></span>
                      <span class="seo-app-battery"></span>
                    </span>
                  </div>
                  <div class="seo-app-topbar">
                    <span class="seo-app-back" aria-hidden="true">&lsaquo;</span>
                    <p class="seo-app-title">Select destination</p>
                    <span></span>
                  </div>
                  ${choices.map((choice, index) => renderChoice(choice, index === 0)).join("")}
                  <div class="seo-flow-note">
                    <strong>Next</strong>
                    <span>Choose amount and delivery method.</span>
                  </div>
                </div>
              </article>

              <article class="seo-flow-panel" data-flow-panel="amount" aria-hidden="true">
                <div class="seo-app-screen seo-flow-app-screen">
                  <div class="seo-app-status" aria-hidden="true">
                    <span>9:41</span>
                    <span class="seo-app-indicators">
                      <span class="seo-app-signal"><i></i><i></i><i></i></span>
                      <span class="seo-app-wifi"></span>
                      <span class="seo-app-battery"></span>
                    </span>
                  </div>
                  <div class="seo-app-topbar">
                    <span class="seo-app-back" aria-hidden="true">&lsaquo;</span>
                    <p class="seo-app-title">Enter amount</p>
                    <span></span>
                  </div>
                  <div class="seo-app-amount-card seo-flow-highlight">
                    <div>
                      <span class="seo-app-label">You send exactly</span>
                      <strong>${escapeHtml(sourceAmount)}</strong>
                    </div>
                    <span class="seo-app-currency">
                      ${renderFlag(sourceFlag)}
                      ${escapeHtml(sourceCurrency)}
                    </span>
                  </div>
                  <p class="seo-app-rate">${escapeHtml(rate)}</p>
                  <div class="seo-app-amount-card">
                    <div>
                      <span class="seo-app-label">Recipient gets</span>
                      <strong>${escapeHtml(recipientAmount)}</strong>
                    </div>
                    <span class="seo-app-currency">
                      ${renderFlag(flag)}
                      ${escapeHtml(currency)}
                    </span>
                  </div>
                  <div class="seo-app-notice">
                    <span>Rate estimate</span>
                    <span aria-hidden="true">&rsaquo;</span>
                  </div>
                  <div class="seo-app-rail seo-flow-highlight">
                    ${railMark}
                    <div>
                      <strong>${escapeHtml(railName)}</strong>
                      <span>${escapeHtml(railDetail)}</span>
                    </div>
                  </div>
                  <div class="seo-app-breakdown">
                    <div class="seo-app-detail"><span class="seo-app-detail-label">Amount to send</span><strong>${escapeHtml(sourceCurrency)} ${escapeHtml(sourceAmount)}</strong></div>
                    <div class="seo-app-detail"><span class="seo-app-detail-label">Fees</span><strong>${escapeHtml(sourceFee)}</strong></div>
                    <div class="seo-app-detail"><span class="seo-app-detail-label">Exchange rate</span><strong>${escapeHtml(rate)}</strong></div>
                    <div class="seo-app-detail"><span class="seo-app-detail-label">Recipient gets</span><strong>${escapeHtml(currency)} ${escapeHtml(recipientAmount)}</strong></div>
                    <div class="seo-app-detail seo-app-total"><span>Total deductible</span><strong>${escapeHtml(sourceTotal)}</strong></div>
                  </div>
                  <span class="seo-app-button">Continue</span>
                </div>
              </article>

              <article class="seo-flow-panel" data-flow-panel="recipient" aria-hidden="true">
                <div class="seo-app-screen seo-flow-app-screen seo-flow-details-screen">
                  <div class="seo-app-status" aria-hidden="true">
                    <span>9:41</span>
                    <span class="seo-app-indicators">
                      <span class="seo-app-signal"><i></i><i></i><i></i></span>
                      <span class="seo-app-wifi"></span>
                      <span class="seo-app-battery"></span>
                    </span>
                  </div>
                  <div class="seo-app-topbar">
                    <span class="seo-app-back" aria-hidden="true">&lsaquo;</span>
                    <p class="seo-app-title">Transfer details</p>
                    <span></span>
                  </div>
                  <div class="seo-flow-detail-card seo-flow-highlight">
                    <span>Recipient</span>
                    <strong>${escapeHtml(recipientName)}</strong>
                    <small>${escapeHtml(railName)} account in ${escapeHtml(country)}</small>
                  </div>
                  <div class="seo-flow-detail-card">
                    <span>Source account</span>
                    <strong>${escapeHtml(sourceCurrency)} wallet</strong>
                    <small>${escapeHtml(sourceAvailable)}</small>
                  </div>
                  <div class="seo-flow-detail-card">
                    <span>Purpose of remittance</span>
                    <strong>${escapeHtml(purpose)}</strong>
                    <small>Purpose selected before final review.</small>
                  </div>
                  <div class="seo-flow-note">
                    <strong>Next</strong>
                    <span>Review rate, fees, delivery method, and total debit.</span>
                  </div>
                  <span class="seo-app-button">Review transfer</span>
                </div>
              </article>

              <article class="seo-flow-panel" data-flow-panel="confirm" aria-hidden="true">
                <div class="seo-app-screen seo-flow-app-screen">
                  <div class="seo-app-status" aria-hidden="true">
                    <span>9:41</span>
                    <span class="seo-app-indicators">
                      <span class="seo-app-signal"><i></i><i></i><i></i></span>
                      <span class="seo-app-wifi"></span>
                      <span class="seo-app-battery"></span>
                    </span>
                  </div>
                  <div class="seo-app-topbar">
                    <span class="seo-app-back" aria-hidden="true">&lsaquo;</span>
                    <p class="seo-app-title">Review transfer</p>
                    <span></span>
                  </div>
                  <div class="seo-app-amount-card">
                    <div><span class="seo-app-label">You send exactly</span><strong>${escapeHtml(sourceAmount)}</strong></div>
                    <span class="seo-app-currency">${renderFlag(sourceFlag)}${escapeHtml(sourceCurrency)}</span>
                  </div>
                  <p class="seo-app-rate">${escapeHtml(rate)}</p>
                  <div class="seo-app-amount-card">
                    <div><span class="seo-app-label">Recipient gets</span><strong>${escapeHtml(recipientAmount)}</strong></div>
                    <span class="seo-app-currency">${renderFlag(flag)}${escapeHtml(currency)}</span>
                  </div>
                  <div class="seo-app-rail seo-flow-highlight">
                    ${railMark}
                    <div>
                      <strong>${escapeHtml(railName)}</strong>
                      <span>${escapeHtml(railDetail)}</span>
                    </div>
                  </div>
                  <div class="seo-app-breakdown seo-flow-highlight">
                    <div class="seo-app-detail"><span class="seo-app-detail-label">Recipient</span><strong>${escapeHtml(recipientName)}</strong></div>
                    <div class="seo-app-detail"><span class="seo-app-detail-label">Fees</span><strong>${escapeHtml(sourceFee)}</strong></div>
                    <div class="seo-app-detail"><span class="seo-app-detail-label">Recipient gets</span><strong>${escapeHtml(currency)} ${escapeHtml(recipientAmount)}</strong></div>
                    <div class="seo-app-detail seo-app-total"><span>Total deductible</span><strong>${escapeHtml(sourceTotal)}</strong></div>
                  </div>
                  <div class="seo-flow-pin-sheet seo-flow-highlight">
                    <span>Secure confirmation</span>
                    <strong>Enter PIN</strong>
                    <div aria-hidden="true"><i></i><i></i><i></i><i></i></div>
                  </div>
                  <span class="seo-app-button">Send money</span>
                </div>
              </article>

              ${receiptPanel}
            </div>
          </aside>
        </div>

        <p class="seo-note">Final rates, fees, timing, and payout availability are confirmed before you send.</p>
      `;

      section.removeAttribute("data-seo-flow-template");
    });
  };
})(window);
