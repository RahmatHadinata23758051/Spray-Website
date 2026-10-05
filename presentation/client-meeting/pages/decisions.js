// Open Decisions Page Component
function renderDecisionsPage(container) {
    // Data is assumed to be available from data.js
    let rowsHtml = '';
    
    if (typeof decisionTopics !== 'undefined') {
        decisionTopics.forEach((item, index) => {
            rowsHtml += `
                <div class="decision-row">
                    <div class="dec-col dec-topic">
                        <span class="dec-number">${(index + 1).toString().padStart(2, '0')}</span>
                        <span class="dec-topic-text">${item.topic}</span>
                    </div>
                    <div class="dec-col dec-current">
                        <div class="dec-label">Konsep Saat Ini</div>
                        <p>${item.current}</p>
                    </div>
                    <div class="dec-col dec-confirm">
                        <div class="dec-label highlight">Pertanyaan Konfirmasi</div>
                        <p>${item.confirm}</p>
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = `
        <div class="decisions-content">
            <div class="page-header sticky-header">
                <h2>Hal yang Perlu Disepakati</h2>
                <p>Topik penting yang memerlukan diskusi dan konfirmasi bersama klien sebelum berlanjut</p>
            </div>
            
            <div class="decisions-table">
                <div class="decisions-table-header">
                    <div class="dec-col dec-topic">Topik</div>
                    <div class="dec-col dec-current">Konsep Saat Ini</div>
                    <div class="dec-col dec-confirm">Perlu Dikonfirmasi</div>
                </div>
                <div class="decisions-table-body">
                    ${rowsHtml}
                </div>
            </div>
        </div>
    `;
}
