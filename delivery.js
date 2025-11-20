// JavaScript для доставки в пункт выдачи с расчетом веса
// Настройки API

const API_BASE_URL = 'https://insales-delivery-api.netlify.app';
// Получение пунктов выдачи по городу
function getPickupPoints(city) {
  const requestBody = {
    city: city || ''
  };

  return fetch(API_BASE_URL + '/api/pickup-points', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  .then(response => response.json())
  .then(data => data.pickup_points);
}

// Расчет стоимости доставки до выбранного ПВЗ
function calculatePickupDelivery(orderWeight, pickupPointId) {
  const requestBody = {
    order: {
      total_weight: orderWeight || 0
    },
    pickup_point_id: pickupPointId
  };

  return fetch(API_BASE_URL + '/api/pickup-point/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  .then(response => response.json())
  .then(data => ({
    price: data.price,
    currency: data.currency,
    delivery_days: data.delivery_days,
    description: data.description
  }));
}

// Инициализация при загрузке страницы
function initializePickupDelivery() {
  // Ожидаем полной загрузки DOM
  document.addEventListener('DOMContentLoaded', function() {
    setupPickupPointsLoader();
  });
  
  // Также запускаем при загрузке страницы (для старых браузеров)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPickupPointsLoader);
  } else {
    setupPickupPointsLoader();
  }
}

// Настройка загрузки пунктов выдачи
function setupPickupPointsLoader() {
  // Ищем поле города доставки
  const cityField = findCityField();
  
  if (cityField) {
    // Очищаем предыдущие обработчики
    cityField.removeEventListener('change', loadPickupPointsHandler);
    
    // Добавляем новый обработчик
    cityField.addEventListener('change', loadPickupPointsHandler);
    
    // Если город уже заполнен, загружаем пункты сразу
    if (cityField.value && cityField.value.trim()) {
      setTimeout(() => loadPickupPointsHandler(), 500);
    }
  }
}

// Обработчик загрузки пунктов выдачи
function loadPickupPointsHandler() {
  const city = findCityField()?.value?.trim();
  
  if (city && city.length > 2) {
    loadPickupPoints(city);
  } else {
    clearPickupPoints();
  }
}

// Загрузка и отображение пунктов выдачи
function loadPickupPoints(city) {
  const pickupContainer = findPickupContainer();
  
  if (!pickupContainer) {
    console.warn('Контейнер для пунктов выдачи не найден');
    return;
  }

  // Показываем индикатор загрузки
  pickupContainer.innerHTML = '<div class="pickup-loading">Загрузка пунктов выдачи...</div>';

  getPickupPoints(city)
    .then(points => {
      displayPickupPoints(points);
    })
    .catch(error => {
      console.error('Ошибка загрузки ПВЗ:', error);
      pickupContainer.innerHTML = '<div class="pickup-error">Ошибка загрузки пунктов выдачи</div>';
    });
}

// Отображение пунктов выдачи
function displayPickupPoints(points) {
  const pickupContainer = findPickupContainer();
  
  if (!pickupContainer) return;

  if (!points || points.length === 0) {
    pickupContainer.innerHTML = '<div class="pickup-empty">Пункты выдачи в данном городе не найдены</div>';
    return;
  }

  // Создаем HTML для пунктов выдачи
  const pointsHTML = points.map((point, index) => `
    <div class="pickup-point" data-id="${point.id}" data-index="${index}">
      <div class="pickup-point-header">
        <h4 class="pickup-point-title">${point.title}</h4>
      </div>
      <div class="pickup-point-details">
        <p class="pickup-point-address"><strong>Адрес:</strong> ${point.address}</p>
        <p class="pickup-point-hours"><strong>Режим работы:</strong> ${point.working_hours}</p>
        <p class="pickup-point-phone"><strong>Телефон:</strong> ${point.phone}</p>
      </div>
      <div class="pickup-point-price" id="price-${point.id}">
        Выберите для расчета стоимости
      </div>
    </div>
  `).join('');

  pickupContainer.innerHTML = pointsHTML;

  // Добавляем обработчики клика для каждого пункта
  pickupContainer.querySelectorAll('.pickup-point').forEach(pointElement => {
    pointElement.addEventListener('click', function() {
      selectPickupPoint(this);
    });
  });

  // Стилизуем контейнер
  if (!pickupContainer.classList.contains('pickup-points-styled')) {
    stylePickupContainer(pickupContainer);
  }
}

// Выбор пункта выдачи и расчет стоимости
function selectPickupPoint(pointElement) {
  const pointId = pointElement.dataset.id;
  const pointTitle = pointElement.querySelector('.pickup-point-title').textContent;
  
  // Получаем вес заказа
  const orderWeight = getOrderWeight();
  
  if (orderWeight <= 0) {
    alert('Укажите вес заказа для расчета стоимости доставки');
    return;
  }

  // Показываем индикатор расчета
  const priceElement = pointElement.querySelector('.pickup-point-price');
  priceElement.innerHTML = '<div class="price-loading">Расчет стоимости...</div>';

  // Снимаем выделение с других пунктов
  document.querySelectorAll('.pickup-point').forEach(p => {
    p.classList.remove('selected');
    const priceEl = p.querySelector('.pickup-point-price');
    if (priceEl && !priceEl.classList.contains('final-price')) {
      priceEl.textContent = 'Выберите для расчета стоимости';
    }
  });

  // Выделяем выбранный пункт
  pointElement.classList.add('selected');

  // Рассчитываем стоимость
  calculatePickupDelivery(orderWeight, pointId)
    .then(result => {
      priceElement.innerHTML = `
        <div class="final-price">
          <span class="price-value">${result.price} ${result.currency}</span>
          <div class="price-details">
            <small>${result.description}</small>
            <small>Срок доставки: ${result.delivery_days} ${result.delivery_days === 1 ? 'день' : 'дня'}</small>
          </div>
        </div>
      `;
      priceElement.classList.add('final-price');
      
      // Сохраняем выбранный пункт
      window.selectedPickupPoint = {
        id: pointId,
        title: pointTitle,
        price: result.price,
        currency: result.currency
      };
      
      // Обновляем итоговую информацию о доставке
      updateDeliverySummary(result);
    })
    .catch(error => {
      console.error('Ошибка расчета стоимости:', error);
      priceElement.innerHTML = '<div class="price-error">Ошибка расчета стоимости</div>';
    });
}

// Обновление итоговой информации о доставке
function updateDeliverySummary(deliveryData) {
  // Ищем элементы для отображения итоговой информации
  const summaryElements = [
    '.delivery-summary',
    '.shipping-summary', 
    '.order-summary',
    '.checkout-summary'
  ];
  
  summaryElements.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      // Ищем или создаем блок с информацией о доставке
      let deliveryBlock = element.querySelector('.delivery-info');
      if (!deliveryBlock) {
        deliveryBlock = document.createElement('div');
        deliveryBlock.className = 'delivery-info';
        element.appendChild(deliveryBlock);
      }
      
      deliveryBlock.innerHTML = `
        <div class="delivery-selected">
          <h4>Выбранная доставка:</h4>
          <p><strong>${deliveryData.description}</strong></p>
          <p>Стоимость: <strong>${deliveryData.price} ${deliveryData.currency}</strong></p>
          <p>Срок доставки: ${deliveryData.delivery_days} ${deliveryData.delivery_days === 1 ? 'день' : 'дня'}</p>
        </div>
      `;
    }
  });
}

// Очистка списка пунктов выдачи
function clearPickupPoints() {
  const pickupContainer = findPickupContainer();
  if (pickupContainer) {
    pickupContainer.innerHTML = '<div class="pickup-hint">Введите город для выбора пункта выдачи</div>';
  }
}

// Вспомогательные функции для поиска элементов
function findCityField() {
  const selectors = [
    'input[name*="city"]',
    'input[name*="shipping_address[city]"]',
    '.shipping-city',
    '.shipping-address-city',
    '[data-city]',
    '#shipping_city'
  ];
  
  for (const selector of selectors) {
    const field = document.querySelector(selector);
    if (field) return field;
  }
  return null;
}

function findPickupContainer() {
  const selectors = [
    '.pickup-points',
    '.delivery-pickup',
    '.shipping-pickup',
    '.order-pickup',
    '[data-pickup-points]',
    '#pickup-points'
  ];
  
  for (const selector of selectors) {
    const container = document.querySelector(selector);
    if (container) return container;
  }
  return null;
}

function getOrderWeight() {
  const selectors = [
    'input[name*="weight"]',
    'input[name*="total_weight"]',
    '.order-weight',
    '.product-weight',
    '[data-weight]',
    '#total_weight'
  ];
  
  for (const selector of selectors) {
    const field = document.querySelector(selector);
    if (field) {
      const weight = parseFloat(field.value);
      if (!isNaN(weight) && weight > 0) {
        return weight;
      }
    }
  }
  return 0;
}

// Стилизация контейнера пунктов выдачи
function stylePickupContainer(container) {
  const style = document.createElement('style');
  style.textContent = `
    .pickup-point {
      border: 2px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
      cursor: pointer;
      transition: all 0.3s ease;
      background: white;
    }
    
    .pickup-point:hover {
      border-color: #007bff;
      box-shadow: 0 2px 8px rgba(0,123,255,0.15);
    }
    
    .pickup-point.selected {
      border-color: #28a745;
      background: #f8fff9;
    }
    
    .pickup-point-title {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 16px;
      font-weight: bold;
    }
    
    .pickup-point-details p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }
    
    .pickup-point-price {
      margin-top: 10px;
      padding: 8px;
      background: #f8f9fa;
      border-radius: 4px;
      text-align: center;
      font-weight: bold;
      color: #495057;
    }
    
    .final-price {
      background: #28a745 !important;
      color: white !important;
    }
    
    .price-loading, .pickup-loading {
      color: #007bff;
      font-style: italic;
    }
    
    .price-error, .pickup-error {
      color: #dc3545;
      background: #f8d7da;
      padding: 8px;
      border-radius: 4px;
    }
    
    .pickup-empty, .pickup-hint {
      text-align: center;
      color: #6c757d;
      padding: 20px;
      font-style: italic;
    }
    
    .delivery-info {
      background: #e7f3ff;
      border: 1px solid #b3d7ff;
      border-radius: 4px;
      padding: 15px;
      margin: 10px 0;
    }
    
    .delivery-info h4 {
      margin: 0 0 10px 0;
      color: #004085;
    }
    
    .delivery-info p {
      margin: 5px 0;
    }
  `;
  document.head.appendChild(style);
  container.classList.add('pickup-points-styled');
}

// Проверка доступности API
function checkAPIHealth() {
  fetch(API_BASE_URL + '/health')
    .then(response => response.json())
    .then(data => {
      console.log('✅ API доставки доступен:', data.message);
    })
    .catch(error => {
      console.error('❌ API доставки недоступен:', error);
    });
}

// Инициализация
initializePickupDelivery();

// Проверяем API при загрузке
setTimeout(checkAPIHealth, 2000);

// Отладка
console.log('🚀 JavaScript доставки в пункт выдачи загружен');
console.log('🔧 Для отладки используйте: findCityField(), findPickupContainer(), getOrderWeight()');
