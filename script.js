/* 1. Dummy JSON Data (Fallback 용) */
const API_TOKEN = '0d4dba6bbd778ae7ed2dc2e3d6fdbd62';
const WORKER_URL = 'https://round-salad-07d1.song7596.workers.dev';

// API 호출 함수 (Cloudflare Worker 프록시 경유)
async function proxyFetch(targetUrl) {
    const strategies = [
        // 1순위: Cloudflare Worker (GitHub Pages 등 어디서든 작동)
        () => fetch(`${WORKER_URL}/?target=${encodeURIComponent(targetUrl)}`),
        // 2순위: 로컬 프록시 (개발용, proxy.py 실행 시)
        () => fetch('/api/' + targetUrl)
    ];
    
    for (const tryFetch of strategies) {
        try {
            const res = await tryFetch();
            if (res.ok) {
                return await res.json();
            }
        } catch(e) {
            console.warn('프록시 시도 실패:', e.message);
        }
    }
    throw new Error('모든 API 호출 방법 실패');
}

// 사용자가 선택한 출발/도착 IATA 코드 (딥링크용)
let selectedOriginIATA = 'CJU';
let selectedDestIATA = 'BKK';

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

        // 항공 탭 외에는 "준비중" 표시
        const targetId = btn.getAttribute('data-target');
        if (targetId !== 'flight') {
            // 항공 탭을 다시 활성화
            document.querySelector('[data-target="flight"]').classList.add('active');
            document.getElementById('flight').classList.add('active');
            alert('🚧 준비중입니다!\n\n해당 서비스는 현재 개발 중이에요.\n빠른 시일 내에 오픈할 예정입니다. 😊');
            return;
        }
        
        // 선택된 탭 활성화
        btn.classList.add('active');
        document.getElementById(targetId).classList.add('active');
        
        // 클릭한 탭이 모바일 화면 중앙에 오도록 스크롤 이동
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
});

/* --- 추가 기능: Flatpickr 날짜 선택기 초기화 --- */
let datePicker = flatpickr("#flight_date", {
    mode: "range",
    minDate: "today",
    locale: "ko", // 한국어 로케일 활성화
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "m.d (D)",
    defaultDate: ["today", new Date().fp_incr(4)] // 기본값: 오늘~4일뒤
});

// 편도, 왕복 라디오 버튼에 따른 달력 모드 스위칭
const tripRadios = document.querySelectorAll('input[name="trip"]');
tripRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if(e.target.id === 'trip_ow') {
            datePicker.set('mode', 'single');
        } else if(e.target.id === 'trip_rt') {
            datePicker.set('mode', 'range');
        }
    });
});

/* --- 추가 기능: 출발지/도착지 스왑 버튼 --- */
const swapBtn = document.getElementById('swap_airports');
if (swapBtn) {
    swapBtn.addEventListener('click', () => {
        const originInput = document.getElementById('search_origin');
        const destInput = document.getElementById('search_dest');
        const temp = originInput.value;
        originInput.value = destInput.value;
        destInput.value = temp;
    });
}

/* --- 추가 기능: 공항 자동완성 (Autocomplete) --- */
let debounceTimer;
async function fetchPlaces(query, listElement, inputElement) {
    if(query.length < 2) {
        listElement.classList.add('hidden');
        return;
    }
    
    // API 호출 부하를 막기 위해 디바운싱 처리 (300ms)
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        try {
            const rawUrl = `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(query)}&locale=ko&types[]=airport&types[]=city`;
            const data = await proxyFetch(rawUrl);
            
            listElement.innerHTML = '';
            if(data && data.length > 0) {
                data.forEach(place => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${place.name}</strong> (${place.code}) - ${place.country_name}`;
                    li.addEventListener('click', () => {
                        inputElement.value = `${place.name}(${place.code})`;
                        listElement.classList.add('hidden');
                        // IATA 코드를 전역 변수에 저장 (딥링크에서 사용)
                        if (inputElement.id === 'search_origin') {
                            selectedOriginIATA = place.code;
                        } else if (inputElement.id === 'search_dest') {
                            selectedDestIATA = place.code;
                        }
                    });
                    listElement.appendChild(li);
                });
                listElement.classList.remove('hidden');
            } else {
                listElement.classList.add('hidden');
            }
        } catch(e) {
            console.error("Autocomplete fetching error:", e);
        }
    }, 300);
}

// 자동완성 이벤트 리스너 바인딩
const originInputElem = document.getElementById('search_origin');
const destInputElem = document.getElementById('search_dest');
const originList = document.getElementById('origin_list');
const destList = document.getElementById('dest_list');

if (originInputElem) {
    originInputElem.addEventListener('input', (e) => fetchPlaces(e.target.value, originList, originInputElem));
}
if (destInputElem) {
    destInputElem.addEventListener('input', (e) => fetchPlaces(e.target.value, destList, destInputElem));
}

// 화면의 외부를 클릭하면 드롭다운 닫힘
document.addEventListener('click', (e) => {
    if(!e.target.closest('.autocomplete-wrapper')) {
        if(originList) originList.classList.add('hidden');
        if(destList) destList.classList.add('hidden');
    }
});

let priceChartInstance = null; // 기존 차트 초기화를 위한 전역 변수

/* 3. 검색 버튼 및 페이드인, API 호출 타이밍 제어 */
const searchBtn = document.getElementById('search-btn');
const loadingSection = document.getElementById('loading');
const resultsSection = document.getElementById('results');

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

        // 전역 변수에 IATA 코드 저장 (딥링크용)
        selectedOriginIATA = originCode;
        selectedDestIATA = destCode;
        
        // 진짜 API 연동
        await fetchFlightData(originCode, destCode);

        // 로딩 종료, 결과 영역 등장
        loadingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        
// 약간의 딜레이 후 show 클래스를 줘서 완벽한 Fade-In 효과 연출
        setTimeout(() => {
            // 차트 제목 변경
            const chartTitle = document.getElementById('chart_title');
            if(chartTitle) {
                chartTitle.innerText = `가격 추이 (${originCode} ➔ ${destCode})`;
            }

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
        const rawUrl = `https://api.travelpayouts.com/aviasales/v3/get_latest_prices?origin=${origin}&destination=${destination}&token=${API_TOKEN}&currency=krw&limit=30&period_type=month`;
        const json = await proxyFetch(rawUrl);
        
        console.log('API 응답:', json); // 디버깅용
        
        if (json.success && json.data && json.data.length > 0) {
            // 출발일 기준으로 정렬
            const sorted = json.data.sort((a, b) => new Date(a.depart_date) - new Date(b.depart_date));
            
            // 전체 원본 데이터 저장 (카테고리별 분류용)
            currentData.allFlights = sorted;
            
            // 날짜 파싱 헬퍼 함수 (ISO 타임스탬프 → Date 객체)
            function parseDate(isoStr) {
                const d = new Date(isoStr);
                return {
                    year: d.getFullYear(),
                    month: d.getMonth() + 1,
                    day: d.getDate(),
                    // 그래프 라벨용: "4월 22일"
                    label: `${d.getMonth() + 1}월 ${d.getDate()}일`,
                    // 카드 표시용: "2026-04-22"
                    display: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
                    // 딥링크용 DDMM: "2204"
                    ddmm: `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}`
                };
            }
            
            // 그래프 데이터 매핑
            currentData.priceTrend = sorted.map(item => {
                const pd = parseDate(item.depart_date);
                return {
                    date: pd.label,
                    price: item.value
                };
            });
            
            // 가격순 정렬 (최저가 계산용)
            const sortedByPrice = [...sorted].sort((a,b) => a.value - b.value);
            
            // 카드 추천 리스트 매핑 (최저가 3개)
            currentData.recommendations = sortedByPrice.slice(0, 3).map((item, idx) => {
                let tagText = idx === 0 ? '🔥 지금 최저가' : (idx === 1 ? '✨ 인기 일정' : '💡 날짜 유연 추천');
                const pd = parseDate(item.depart_date);
                return {
                    airline: item.gate || '제휴 검색',
                    route: `${origin} ➔ ${destination}`,
                    time: `${pd.label} 출발`,
                    price: item.value.toLocaleString() + '원',
                    tag: tagText,
                    origin: origin,
                    destination: destination,
                    depart_date: pd.display, // YYYY-MM-DD 정규 포맷
                    depart_ddmm: pd.ddmm    // 딥링크용 DDMM
                };
            });
            
            // --- 데이터 바인딩: "얼마 이득!" 실시간 계산 ---
            const resultHighlight = document.getElementById('result_highlight');
            const resultSubtitle = document.getElementById('result_subtitle');
            
            const lowestPrice = sortedByPrice[0].value;
            const sumPrice = sorted.reduce((acc, curr) => acc + curr.value, 0);
            const avgPrice = sumPrice / sorted.length;
            
            const diff = avgPrice > lowestPrice ? Math.floor((avgPrice - lowestPrice) / 1000) * 1000 : 0;
            const bestPd = parseDate(sortedByPrice[0].depart_date);
            
            if (diff > 0) {
                resultHighlight.innerText = `평균가 대비 약 ${diff.toLocaleString()}원 이득!`;
            } else {
                resultHighlight.innerText = `가장 핫한 특가 티켓 발견!`;
            }
            resultSubtitle.innerText = `${bestPd.label}에 출발하는 ${lowestPrice.toLocaleString()}원 항공편이 가장 저렴해요!`;
            
            return;
        }
    } catch(e) {
        console.error("Travelpayouts API Error: ", e);
    }
    
    // API 데이터가 없거나 실패 시 더미 데이터 렌더링 (Fallback)
    currentData = JSON.parse(JSON.stringify(mockData));
    
    let fallbackDate = new Date().toISOString().split('T')[0];
    if (datePicker && datePicker.selectedDates.length > 0) {
        fallbackDate = flatpickr.formatDate(datePicker.selectedDates[0], "Y-m-d");
    }
    
    currentData.recommendations.forEach(r => {
         r.route = `${origin} ➔ ${destination}`;
         r.origin = origin;
         r.destination = destination;
         r.depart_date = fallbackDate;
         r.depart_ddmm = fallbackDate.slice(8,10) + fallbackDate.slice(5,7);
    });
    
    const resultHighlight = document.getElementById('result_highlight');
    const resultSubtitle = document.getElementById('result_subtitle');
    if(resultHighlight && resultSubtitle) {
        resultHighlight.innerText = `약 30,000원 이득! (예상)`;
        resultSubtitle.innerText = `데이터를 충분히 불러오지 못해 예상 가격을 보여드려요.`;
    }
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

/* 5. 세 가지 카테고리 카드 렌더링 */
function renderCards() {
    const gridSelected = document.getElementById('grid-selected-date');
    const gridNearby = document.getElementById('grid-nearby-cheapest');
    const gridFlexible = document.getElementById('grid-flexible');
    
    gridSelected.innerHTML = '';
    gridNearby.innerHTML = '';
    gridFlexible.innerHTML = '';
    
    // 전체 API 데이터 가져오기
    const allData = currentData.allFlights || [];
    
    if (allData.length === 0) {
        // 폴백: 기존 recommendations 사용
        currentData.recommendations.forEach(item => {
            gridFlexible.appendChild(createFlightCard(item));
        });
        return;
    }
    
    // 사용자가 선택한 출발일 가져오기
    let userDate = null;
    if (datePicker && datePicker.selectedDates.length > 0) {
        userDate = datePicker.selectedDates[0];
    }
    
    // --- 카테고리 1: 선택한 날짜 근처 (±3일) 예약사이트별 ---
    if (userDate) {
        const userTime = userDate.getTime();
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        const nearUserDate = allData.filter(f => {
            const diff = Math.abs(new Date(f.depart_date).getTime() - userTime);
            return diff <= threeDays;
        }).sort((a, b) => a.value - b.value);
        
        const cat1Title = document.getElementById('cat1_title');
        const cat1Desc = document.getElementById('cat1_desc');
        const m = userDate.getMonth() + 1;
        const d = userDate.getDate();
        if (cat1Title) cat1Title.innerText = `${m}월 ${d}일 전후 예약사이트별 가격`;
        if (cat1Desc) cat1Desc.innerText = `선택하신 날짜 ±3일 이내 항공편을 사이트별로 비교했어요`;
        
        nearUserDate.forEach(f => {
            gridSelected.appendChild(createFlightCard(formatFlight(f)));
        });
        
        if (nearUserDate.length === 0) {
            gridSelected.innerHTML = '<p style="color:#999; padding:20px;">선택한 날짜 근처에 데이터가 없어요. 날짜를 바꿔보세요!</p>';
        }
    } else {
        gridSelected.innerHTML = '<p style="color:#999; padding:20px;">위에서 날짜를 선택하면 해당 날짜의 사이트별 가격을 보여드려요!</p>';
    }
    
    // --- 카테고리 2: 가까운 시일 내 최저가 (오늘부터 30일 이내) ---
    const now = new Date().getTime();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const nearbyFlights = allData
        .filter(f => {
            const fTime = new Date(f.depart_date).getTime();
            return fTime >= now && fTime <= now + thirtyDays;
        })
        .sort((a, b) => a.value - b.value)
        .slice(0, 4);
    
    nearbyFlights.forEach(f => {
        gridNearby.appendChild(createFlightCard(formatFlight(f)));
    });
    if (nearbyFlights.length === 0) {
        gridNearby.innerHTML = '<p style="color:#999; padding:20px;">30일 이내 출발 데이터가 없어요.</p>';
    }
    
    // --- 카테고리 3: 날짜 무관 전체 최저가 ---
    const allSorted = [...allData].sort((a, b) => a.value - b.value).slice(0, 4);
    allSorted.forEach(f => {
        gridFlexible.appendChild(createFlightCard(formatFlight(f)));
    });
}

/* API 원본 데이터 → 카드용 포맷 변환 */
function formatFlight(item) {
    const d = new Date(item.depart_date);
    const label = `${d.getMonth()+1}월 ${d.getDate()}일`;
    const display = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const ddmm = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}`;
    
    return {
        airline: item.gate || '제휴 검색',
        route: `${item.origin} ➔ ${item.destination}`,
        time: `${label} 출발`,
        price: item.value.toLocaleString() + '원',
        tag: item.number_of_changes === 0 ? '✈️ 직항' : `🔄 경유 ${item.number_of_changes}회`,
        origin: item.origin,
        destination: item.destination,
        depart_date: display,
        depart_ddmm: ddmm,
        rawPrice: item.value
    };
}

/* 카드 DOM 생성 (공통) */
function createFlightCard(item) {
    const card = document.createElement('div');
    card.className = 'flight-card';
    card.innerHTML = `
        <div class="flight-card-header">
            <span><i class="fa-solid fa-plane-departure"></i> ${item.time}</span>
        </div>
        <div class="flight-card-route">${item.route}</div>
        <div class="flight-card-price">${item.price}</div>
        <div class="flight-card-tag">${item.tag}</div>
        <div class="gate-badge"><i class="fa-solid fa-globe"></i> ${item.airline}</div>
    `;
    
    card.addEventListener('click', () => {
         const marker = '514287';
         // 사용자가 입력한 원래 출발지/도착지 IATA 코드 사용
         const oIATA = selectedOriginIATA || item.origin || 'ICN';
         const dIATA = selectedDestIATA || item.destination || 'NRT';
         const adults = document.getElementById('pax_adults') ? document.getElementById('pax_adults').value : '1';
         const children = document.getElementById('pax_children') ? document.getElementById('pax_children').value : '0';
         const infants = document.getElementById('pax_infants') ? document.getElementById('pax_infants').value : '0';
         const tripClass = document.getElementById('seat_class') ? document.getElementById('seat_class').value : '0';
         
         // 출발일 (YYYY-MM-DD 형식)
         const departDate = item.depart_date || '';
         
         // 복귀일
         let returnDate = '';
         if(datePicker && datePicker.selectedDates.length >= 2) {
             const rd = datePicker.selectedDates[1];
             returnDate = `${rd.getFullYear()}-${String(rd.getMonth()+1).padStart(2,'0')}-${String(rd.getDate()).padStart(2,'0')}`;
         }
         
         // 편도 여부
         const isOneWay = returnDate === '';
         
         // 공식 Aviasales 딥링크 (쿼리 파라미터 방식)
         let bookingUrl = `https://search.aviasales.com/flights/?origin_iata=${oIATA}&destination_iata=${dIATA}&depart_date=${departDate}&adults=${adults}&children=${children}&infants=${infants}&trip_class=${tripClass}&one_way=${isOneWay}&marker=${marker}`;
         if (returnDate) {
             bookingUrl += `&return_date=${returnDate}`;
         }
         
         console.log('예약 링크:', bookingUrl);
         window.open(bookingUrl, '_blank');
    });
    
    return card;
}
