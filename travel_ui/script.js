/* 1. Travelpayouts API 구조 대비용 Dummy JSON Data */
const mockData = {
    priceTrend: [
        { date: '10월 1주', price: 420000 },
        { date: '10월 2주', price: 380000 },
        { date: '10월 3주', price: 350000 },
        { date: '10월 4주', price: 390000 },
        { date: '11월 1주', price: 290000 }, // 최저가 포인트 (그래프 하단 곡점)
        { date: '11월 2주', price: 310000 },
        { date: '11월 3주', price: 340000 }
    ],
    recommendations: [
        {
            airline: '제주항공',
            route: 'CJU ➔ BKK',
            time: '직항 • 5시간 30분',
            price: '295,000원',
            tag: '🔥 지금 최저가 예약'
        },
        {
            airline: '티웨이항공',
            route: 'CJU ➔ BKK',
            time: '직항 • 5시간 45분',
            price: '302,000원',
            tag: '✨ 좌석 마감 임박'
        },
        {
            airline: '진에어',
            route: 'CJU ➔ BKK',
            time: '직항 • 5시간 35분',
            price: '315,000원',
            tag: '💡 날짜 유연 추천'
        }
    ]
};

/* 2. 메인 탭 전환 로직 (가로 스크롤 포함) */
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // 모든 상태 클리어
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        // 선택된 탭 활성화
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');
        
        // 클릭한 탭이 모바일 화면 중앙에 오도록 스크롤 이동
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
});

let priceChartInstance = null; // 기존 차트 초기화를 위한 전역 변수

/* 3. 검색 버튼 및 페이드인 타이밍 제어 */
const searchBtn = document.getElementById('search-btn');
const loadingSection = document.getElementById('loading');
const resultsSection = document.getElementById('results');
const cardGrid = document.getElementById('card-grid');

searchBtn.addEventListener('click', () => {
    // 이미 결과가 보인다면 서서히 숨김 처리
    resultsSection.classList.remove('show');
    
    setTimeout(() => {
        resultsSection.classList.add('hidden');
        
        // 로딩 스피너 표시
        loadingSection.classList.remove('hidden');

        // 외부 API 통신 대기 시간을 시뮬레이션 (약 1.2초)
        setTimeout(() => {
            // 로딩 종료, 결과 영역 등장
            loadingSection.classList.add('hidden');
            resultsSection.classList.remove('hidden');
            
            // 약간의 딜레이 후 show 클래스를 줘서 완벽한 Fade-In 효과 연출
            setTimeout(() => {
                resultsSection.classList.add('show');
                renderChart();  // 차트 그리기
                renderCards();  // 카드 리스트 그리기
                
                // 자연스럽게 결과 쪽으로 스크롤 다운
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
            
        }, 1200); 
    }, 300); 
});

/* 4. Chart.js 부드러운 곡선 차트 (UX 심리학 기반) */
function renderChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    const labels = mockData.priceTrend.map(d => d.date);
    const dataPoints = mockData.priceTrend.map(d => d.price);

    // 차트 재생성시 캔버스 리셋
    if (priceChartInstance) {
        priceChartInstance.destroy();
    }

    // 선 아래를 채우는 그라디언트 효과 생성
    let gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(255, 112, 67, 0.3)'); 
    gradient.addColorStop(1, 'rgba(255, 112, 67, 0.0)'); 

    priceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '예상 왕복 항공권 가격',
                data: dataPoints,
                borderColor: '#FF7043',
                backgroundColor: gradient,
                borderWidth: 4,               // 시원시원한 두꺼운 선
                pointBackgroundColor: '#FFF',
                pointBorderColor: '#FF7043',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 9,
                fill: true,
                tension: 0.4                  // Curve 효과 (Smooth Line)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#333',
                    bodyColor: '#FF7043',
                    borderColor: '#E8E8E8',
                    borderWidth: 1,
                    padding: 14,
                    boxPadding: 6,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return context.raw.toLocaleString() + '원';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false }
                },
                y: {
                    grid: { color: '#F5F5F5', drawBorder: false },
                    border: { display: false },
                    ticks: {
                        // 정보 피로도를 낮추기 위해 Y축 값(가격 텍스트)을 아예 숨김
                        display: false 
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
}

/* 5. 추천 상품 카드 브라우저 렌더링 */
function renderCards() {
    cardGrid.innerHTML = ''; // 초기화
    
    mockData.recommendations.forEach(item => {
        const card = document.createElement('div');
        card.className = 'flight-card';
        card.innerHTML = `
            <div class="flight-card-header">
                <span><i class="fa-solid fa-plane-departure"></i> ${item.airline}</span>
                <span>${item.time}</span>
            </div>
            <div class="flight-card-route">${item.route}</div>
            <div class="flight-card-price">${item.price}</div>
            <div class="flight-card-tag">${item.tag}</div>
        `;
        cardGrid.appendChild(card);
    });
}
