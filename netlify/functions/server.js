// JavaScript для доставки в пункт выдачи с расчетом веса
const API_BASE_URL = 'https://insales-delivery-api.netlify.app';

// Получение пунктов выдачи по городу
function getPickupPoints(city) {
  console.log('🔍 Запрашиваем ПВЗ для города:', city);
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
  .then(data => {
    console.log('✅ Получили ПВЗ:', data.pickup_points);
    return data.pickup_points;
  });
}

// Расчет стоимости доставки до выбранного ПВЗ
function calculatePickupDelivery(orderWeight, pickupPointId) {
  console.log('🔍 Рассчитываем стоимость для ПВЗ ID:', pickupPointId, 'Вес:', orderWeight);
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
  .then(data => {
    console.log('✅ Рассчитали стоимость:', data);
    return {
      price: data.price,
      currency: data.currency,
      delivery_days: data.delivery_days,
      description: data.description
    };
  });
}

// Инициализация при загрузке страницы
function initializePickupDelivery() {
  document.addEventListener('DOMContentLoaded', function() {
    setupDeliveryMethodObserver(); // Начинаем следить за способом доставки
  });
}

// Функция для наблюдения за изменением способа доставки
function setupDeliveryMethodObserver() {
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        // Проверяем, изменился ли класс у контейнера способов доставки
        if (mutation.target.classList.contains('co-tabs-content--active')) {
          checkAndInitializeForTestMethod();
        }
      }
    });
  });

  // Наблюдаем за всеми способами доставки
  const deliveryLabels = document.querySelectorAll('.co-delivery_method');
  deliveryLabels.forEach(label => {
    observer.observe(label, { attributes: true, attributeFilter: ['class'] });
  });

  // Также проверяем сразу при загрузке
  setTimeout(checkAndInitializeForTestMethod, 1000);
}

// Проверяем, выбран ли способ доставки "тест" (ID 14999345) и инициализируем
function checkAndInitializeForTestMethod() {
  const testDeliveryInput = document.getElementById('order_delivery_variant_id_14999345');
  if (testDeliveryInput && testDeliveryInput.checked) {
    console.log('✅ Выбран способ доставки "тест" (ID 14999345)');
    // Открываем модальное окно (удаляем класс hide)
    const modal = document.querySelector('.co-modal--outlet');
    if (modal) {
      modal.classList.remove('co-modal--hide');
      console.log('✅ Модальное окно открыто');
    }
    setupPickupPointsLoader(); // Инициализируем загрузку ПВЗ
  }
}

// Настройка загрузки пунктов выдачи
function setupPickupPointsLoader() {
  const cityField = findCityField();
  if (cityField) {
    cityField.removeEventListener('change', loadPickupPointsHandler);
    cityField.addEventListener('change', loadPickupPointsHandler);

    // Если город уже заполнен, загружаем ПВЗ
    if (cityField.value && cityField.value.trim()) {
      loadPickupPointsHandler();
    }
  }
}

// Обработчик загрузки пунктов выдачи
function loadPickupPointsHandler() {
  const city = findCityField()?.value?.trim();
  console.log('🔍 Обработчик загрузки ПВЗ вызван для города:', city);
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
    console.warn('❌ Контейнер для пунктов выдачи не найден');
    return;
  }

  pickupContainer.innerHTML = '<div class="pickup-loading">Загрузка пунктов выдачи...</div>';

  getPickupPoints(city)
    .then(points => {
      displayPickupPoints(points);
    })
    .catch(error => {
      console.error('❌ Ошибка загрузки ПВЗ:', error);
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

  pickupContainer.querySelectorAll('.pickup-point').forEach(pointElement => {
    pointElement.addEventListener('click', function() {
      selectPickupPoint(this);
    });
  });

  if (!pickupContainer.classList.contains('pickup-points-styled')) {
    stylePickupContainer(pickupContainer);
  }
}

// Выбор пункта выдачи и расчет стоимости
function selectPickupPoint(pointElement) {
  const pointId = pointElement.dataset.id;
  const pointTitle = pointElement.querySelector('.pickup-point-title').textContent;

  const orderWeight = getOrderWeight();
  if (orderWeight <= 0) {
    alert('Укажите вес заказа для расчета стоимости доставки');
    return;
  }

  const priceElement = pointElement.querySelector('.pickup-point-price');
  priceElement.innerHTML = '<div class="price-loading">Расчет стоимости...</div>';

  document.querySelectorAll('.pickup-point').forEach(p => {
    p.classList.remove('selected');
    const priceEl = p.querySelector('.pickup-point-price');
    if (priceEl && !priceEl.classList.contains('final-price')) {
      priceEl.textContent = 'Выберите для расчета стоимости';
    }
  });

  pointElement.classList.add('selected');

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

      window.selectedPickupPoint = {
        id: pointId,
        title: pointTitle,
        price: result.price,
        currency: result.currency
      };

      // --- ОБНОВЛЕНИЕ СТОИМОСТИ ДОСТАВКИ В INSALES ---
      updateInSalesDeliveryPrice(result.price, result.currency);

      updateDeliverySummary(result);
    })
    .catch(error => {
      console.error('❌ Ошибка расчета стоимости:', error);
      priceElement.innerHTML = '<div class="price-error">Ошибка расчета стоимости</div>';
    });
}

// --- ФУНКЦИЯ ОБНОВЛЕНИЯ СТОИМОСТИ В INSALES ---
function updateInSalesDeliveryPrice(price, currency) {
  // InSales обычно обновляет стоимость доставки через AJAX или через скрытое поле.
  // Обычно стоимость доставки отображается в элементе с ID 'delivery_price'
  const deliveryPriceElement = document.getElementById('delivery_price');
  if (deliveryPriceElement) {
    deliveryPriceElement.textContent = `${price} ${currency}`;
    console.log(`✅ Стоимость доставки обновлена в InSales: ${price} ${currency}`);
  }

  // Также может быть скрытое поле с неформатированной ценой
  const unformattedPriceElement = document.getElementById('delivery_price_unformatted');
  if (unformattedPriceElement) {
    unformattedPriceElement.textContent = price;
    unformattedPriceElement.style.display = 'none'; // Скрываем
  }

  // Итоговая цена заказа (обычно обновляется автоматически, но можно триггерить событие)
  const totalPriceElement = document.getElementById('total_price');
  if (totalPriceElement) {
    // Обычно InSales обновляет итог автоматически при изменении стоимости доставки
    // Но если нет, можно попробовать триггерить событие
    // totalPriceElement.dispatchEvent(new Event('change'));
  }
}

// Обновление итоговой информации о доставке
function updateDeliverySummary(deliveryData) {
  const summaryElements = ['.delivery-summary', '.shipping-summary', '.order-summary', '.checkout-summary'];
  summaryElements.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
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
  const field = document.getElementById('shipping_address_full_locality_name');
  if (field) return field;
  return null;
}

function findPickupContainer() {
  const modalBody = document.querySelector('.js-modal-body');
  if (modalBody) {
    return modalBody;
  }
  return null;
}

function getOrderWeight() {
  // --- ВАЖНО: НУЖНО НАЙТИ, КАК ПОЛУЧИТЬ ВЕС ЗАКАЗА ---
  // В вашем HTML я не нашел прямого элемента с весом.
  // Обычно вес передается в API InSales при расчете стоимости.
  // Возможно, его нужно вычислить из товаров в корзине или получить из скрытого поля.

  // Попробуем найти скрытое поле или рассчитать на основе товаров (гипотетически)
  // const weightElement = document.querySelector('[data-weight]'); // Если есть
  // if (weightElement) {
  //   return parseFloat(weightElement.value) || 0;
  // }

  // Или попробовать получить из скрытого поля, которое InSales может использовать
  // const hiddenWeight = document.getElementById('order_total_weight'); // Пример
  // if (hiddenWeight) {
  //   return parseFloat(hiddenWeight.textContent) || 0;
  // }

  // --- ПОКА ВРЕМЕННОЕ РЕШЕНИЕ: ВОЗВРАЩАЕМ ФИКСИРОВАННОЕ ЗНАЧЕНИЕ ---
  // Нужно будет заменить на реальное получение веса
  console.warn('⚠️ Вес заказа не найден, используем 1.0 кг для теста.');
  return 1.0; // ЗАМЕНИТЕ НА РЕАЛЬНОЕ ЗНАЧЕНИЕ

  // --- ПОИСК ВЕСА В ДАННЫХ ФОРМЫ ---
  // const formData = document.getElementById('order_form');
  // const formDataScripts = formData.querySelectorAll('script');
  // for (let script of formDataScripts) {
  //   if (script.textContent.includes('weight')) {
  //     console.log('Найден скрипт с потенциальным весом:', script.textContent);
  //     // Тут можно попытаться извлечь вес из JSON или JS-объекта
  //   }
  // }
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
    .pickup-point:hover { border-color: #007bff; box-shadow: 0 2px 8px rgba(0,123,255,0.15); }
    .pickup-point.selected { border-color: #28a745; background: #f8fff9; }
    .pickup-point-title { margin: 0 0 10px 0; color: #333; font-size: 16px; font-weight: bold; }
    .pickup-point-details p { margin: 5px 0; color: #666; font-size: 14px; }
    .pickup-point-price { margin-top: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px; text-align: center; font-weight: bold; color: #495057; }
    .final-price { background: #28a745 !important; color: white !important; }
    .price-loading, .pickup-loading { color: #007bff; font-style: italic; }
    .price-error, .pickup-error { color: #dc3545; background: #f8d7da; padding: 8px; border-radius: 4px; }
    .pickup-empty, .pickup-hint { text-align: center; color: #6c757d; padding: 20px; font-style: italic; }
    .delivery-info { background: #e7f3ff; border: 1px solid #b3d7ff; border-radius: 4px; padding: 15px; margin: 10px 0; }
    .delivery-info h4 { margin: 0 0 10px 0; color: #004085; }
    .delivery-info p { margin: 5px 0; }
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
setTimeout(checkAPIHealth, 2000);
console.log('🚀 JavaScript доставки в пункт выдачи загружен');
console.log('🔧 Для отладки используйте: findCityField(), findPickupContainer(), getOrderWeight()');
