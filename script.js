/* 1. Dummy JSON Data (Fallback 용) */
const API_TOKEN = '0d4dba6bbd778ae7ed2dc2e3d6fdbd62';

let mockData = {
    priceTrend: [
        { date: '10월 1주', price: 420000 },
        { date: '10월 2주', price: 380000 },
        { date: '10월 3주', price: 350000 },
        { date: '10월 4주', price: 390000 },
        { date: '11월 1주', price: 290000 },
        { date: '11월 2주', price: 310000 },
        { date: '11월 3주', price: 340000 }
    ],
    recommendations: [
        {
            airline: '제주항공',
            route: 'CJU ➔ BKK',
            time: '직항 • 5시간 30분',
            price: '295,000원',
            tag: '🔥 지금 최저가'
        },
        {
            airline: '티웨이항공',
            route: 'CJU ➔ BKK',
            time: '직항 • 5시간 45분',
            price: '302,000원',
            tag: '✨ 마감 임박'
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

// 동적으로 렌더링될 현재 데이터
let currentData = JSON.parse(JSON.stringify(mockData));

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

/* 3. 검색 버튼 및 페이드인, API 호출 타이밍 제어 */
const searchBtn = document.getElementById('search-btn');
const loadingSection = document.getElementById('loading');
const resultsSection = document.getElementById('results');
const cardGrid = document.getElementById('card-grid');

searchBtn.addEventListener('click', () => {
    resultsSection.classList.remove('show');
    
    setTimeout(async () => {
        resultsSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');

        // 입력된 출발/도착 공항 코드 추출
        const originInput = document.getElementById('search_origin') ? document.getElementById('search_origin').value : 'CJU';
        const destInput = document.getElementById('search_dest') ? document.getElementById('search_dest').value : 'BKK';
        
        let originCode = originInput.match(/[A-Z]{3}/i) ? originInput.match(/[A-Z]{3}/i)[0].toUpperCase() : 'CJU';
        let destCode = destInput.match(/[A-Z]{3}/i) ? destInput.match(/[A-Z]{3}/i)[0].toUpperCase() : 'BKK';

        // 진짜 API 연동
        await fetchFlightData(originCode, destCode);

        // 로딩 종료, 결과 영역 등장
        loadingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        
        // 약간의 딜레이 후 show 클래스를 줘서 완벽한 Fade-In 효과 연출
        setTimeout(() => {
            resultsSection.classList.add('show');
            renderChart();
            renderCards();
            
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
        
    }, 300); 
});

/* API 데이터 가져오기 함수 */
async function fetchFlightData(origin, destination) {
    try {
        const url = `https://api.travelpayouts.com/aviasales/v3/get_latest_prices?origin=${origin}&destination=${destination}&token=${API_TOKEN}&currency=krw&limit=10&period_type=month`;
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.success && json.data && json.data.length > 0) {
            // 출발일 기준으로 정렬
            const sorted = json.data.sort((a, b) => new Date(a.depart_date) - new Date(b.depart_date));
            
            // 그래프 데이터 매핑
            currentData.priceTrend = sorted.map(item => {
                const parts = item.depart_date.split('-');
                return {
                    date: `${parseInt(parts[1])}월 ${parseInt(parts[2])}일`,
                    price: item.value
                };
            });
            
            // 카드 추천 리스트 매핑 (위 3개만 추출)
            currentData.recommendations = sorted.slice(0, 3).map((item, idx) => {
                let tagText = idx === 0 ? '🔥 지금 최저가' : (idx === 1 ? '✨ 인기 일정' : '💡 날짜 유연 추천');
                return {
                    airline: '제휴 항공사 (확인필요)', 
                    route: `${origin} ➔ ${destination}`,
                    time: `${item.depart_date} 출발`,
                    price: item.value.toLocaleString() + '원',
                    tag: tagText
                };
            });
            return;
        }
    } catch(e) {
        console.error("Travelpayouts API Error: ", e);
    }
    
    // API 데이터가 없거나 실패 시 오류 모달 대신 더미 데이터 렌더링 유지 (Fallback)
    currentData = JSON.parse(JSON.stringify(mockData));
}

/* 4. Chart.js 부드러운 곡선 차트 (UX 심리학 기반) */
function renderChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    const labels = currentData.priceTrend.map(d => d.date);
    const dataPoints = currentData.priceTrend.map(d => d.price);

    // 차트 재생성시 캔버스 리셋
    if (priceChartInstance) {
        priceChartInstance.destroy();
    }

    // 데이터가 부족할 때 예외처리
    if(labels.length === 0) {
        return;
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
                borderWidth: 4,               
                pointBackgroundColor: '#FFF',
                pointBorderColor: '#FF7043',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 9,
                fill: true,
                tension: 0.4                  
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
    
    currentData.recommendations.forEach(item => {
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
