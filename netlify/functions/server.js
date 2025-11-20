const pickupPoints = [
  // Барановичи
  {
    id: 10201,
    city: "Барановичи",
    name: "СППС №10201",
    address: "г.Барановичи, ул.50 лет БССР, д.31",
    working_hours: "Пн-Сб: с 10:00 до 20:00 обед 14:00 до 14:30",
    phone: "+375-163-00-00-00",
    delivery_address: "г.Барановичи, ул.50 лет БССР, д.31, Беларусь"
  },
  {
    id: 10202,
    city: "Барановичи", 
    name: "СППС №10202",
    address: "г.Барановичи,ул.Комсомольская,д.16,пом.2",
    working_hours: "Пн-Сб: с 10:00 до 20:00 обед 14:00 до 14:30",
    phone: "+375-163-00-00-00",
    delivery_address: "г.Барановичи,ул.Комсомольская,д.16,пом.2, Беларусь"
  },

  // Береза
  {
    id: 10601,
    city: "Береза",
    name: "СППС №10601", 
    address: "г.Берёза, пер. Армейский, 4, пом.22",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 13:00 до 14:00",
    phone: "+375-164-00-00-00",
    delivery_address: "г.Берёза, пер. Армейский, 4, пом.22, Беларусь"
  },

  // Бобруйск
  {
    id: 60201,
    city: "Бобруйск",
    name: "СППС №60201",
    address: "г.Бобруйск, ул. Чехова, 33",
    working_hours: "Пн-Сб: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-225-00-00-00",
    delivery_address: "г.Бобруйск, ул. Чехова, 33, Беларусь"
  },
  {
    id: 60202,
    city: "Бобруйск",
    name: "СППС №60202",
    address: "г.Бобруйск, ул.Комсомольская д.36-1",
    working_hours: "Пн-Сб: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-225-00-00-00",
    delivery_address: "г.Бобруйск, ул.Комсомольская д.36-1, Беларусь"
  },

  // Брест
  {
    id: 20101,
    city: "Брест",
    name: "СППС №20101",
    address: "г.Брест, ул.Советская, д.61",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-162-00-00-00",
    delivery_address: "г.Брест, ул.Советская, д.61, Беларусь"
  },
  {
    id: 20102,
    city: "Брест",
    name: "СППС №20102",
    address: "г.Брест, ул.Гаврилова, д.30",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-162-00-00-00",
    delivery_address: "г.Брест, ул.Гаврилова, д.30, Беларусь"
  },
  {
    id: 20103,
    city: "Брест",
    name: "СППС №20103",
    address: "г.Брест, бул.Шевченко, д.4",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-162-00-00-00",
    delivery_address: "г.Брест, бул.Шевченко, д.4, Беларусь"
  },
  {
    id: 20104,
    city: "Брест",
    name: "СППС №20104",
    address: "г.Брест, ул.Республиканская, д.10",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-162-00-00-00",
    delivery_address: "г.Брест, ул.Республиканская, д.10, Беларусь"
  },
  {
    id: 20105,
    city: "Брест",
    name: "СППС №20105",
    address: "г.Брест, ул.Московская, д.202",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-162-00-00-00",
    delivery_address: "г.Брест, ул.Московская, д.202, Беларусь"
  },

  // Витебск
  {
    id: 50101,
    city: "Витебск",
    name: "СППС №50101",
    address: "г.Витебск, ул.Захарова, д.34",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-212-00-00-00",
    delivery_address: "г.Витебск, ул.Захарова, д.34, Беларусь"
  },
  {
    id: 50102,
    city: "Витебск",
    name: "СППС №50102",
    address: "г.Витебск, пр-т Фрунзе, д.15",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-212-00-00-00",
    delivery_address: "г.Витебск, пр-т Фрунзе, д.15, Беларусь"
  },
  {
    id: 50103,
    city: "Витебск",
    name: "СППС №50103",
    address: "г.Витебск, ул.Ленина, д.36",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-212-00-00-00",
    delivery_address: "г.Витебск, ул.Ленина, д.36, Беларусь"
  },

  // Волковыск
  {
    id: 40101,
    city: "Волковыск",
    name: "СППС №40101",
    address: "г.Волковыск, ул.Жолудева, д.1",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-151-00-00-00",
    delivery_address: "г.Волковыск, ул.Жолудева, д.1, Беларусь"
  },

  // Гомель
  {
    id: 80101,
    city: "Гомель",
    name: "СППС №80101",
    address: "г.Гомель, ул.Кирова, д.44",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-232-00-00-00",
    delivery_address: "г.Гомель, ул.Кирова, д.44, Беларусь"
  },
  {
    id: 80102,
    city: "Гомель",
    name: "СППС №80102",
    address: "г.Гомель, ул.Советская, д.97",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-232-00-00-00",
    delivery_address: "г.Гомель, ул.Советская, д.97, Беларусь"
  },
  {
    id: 80103,
    city: "Гомель",
    name: "СППС №80103",
    address: "г.Гомель, ул.Ланге, д.17",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-232-00-00-00",
    delivery_address: "г.Гомель, ул.Ланге, д.17, Беларусь"
  },

  // Гродно
  {
    id: 40101,
    city: "Гродно",
    name: "СППС №40101",
    address: "г.Гродно, ул.Советская, д.8",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-152-00-00-00",
    delivery_address: "г.Гродно, ул.Советская, д.8, Беларусь"
  },
  {
    id: 40102,
    city: "Гродно",
    name: "СППС №40102",
    address: "г.Гродно, ул.Ожешко, д.33",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-152-00-00-00",
    delivery_address: "г.Гродно, ул.Ожешко, д.33, Беларусь"
  },
  {
    id: 40103,
    city: "Гродно",
    name: "СППС №40103",
    address: "г.Гродно, ул.Дзержинского, д.94",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-152-00-00-00",
    delivery_address: "г.Гродно, ул.Дзержинского, д.94, Беларусь"
  },

  // Жлобин
  {
    id: 80101,
    city: "Жлобин",
    name: "СППС №80101",
    address: "г.Жлобин, ул.Первомайская, д.102",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-234-00-00-00",
    delivery_address: "г.Жлобин, ул.Первомайская, д.102, Беларусь"
  },

  // Жодино
  {
    id: 50101,
    city: "Жодино",
    name: "СППС №50101",
    address: "г.Жодино, ул.Ленина, д.30",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-232-00-00-00",
    delivery_address: "г.Жодино, ул.Ленина, д.30, Беларусь"
  },

  // Лида
  {
    id: 40101,
    city: "Лида",
    name: "СППС №40101",
    address: "г.Лида, ул.Советская, д.25",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-154-00-00-00",
    delivery_address: "г.Лида, ул.Советская, д.25, Беларусь"
  },

  // Минск
  {
    id: 50101,
    city: "Минск",
    name: "СППС №50101",
    address: "г.Минск, пр-т Независимости, 169-1",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, пр-т Независимости, 169-1, Беларусь"
  },
  {
    id: 50102,
    city: "Минск",
    name: "СППС №50102",
    address: "г.Минск, ул.Сурганова, д.53",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, ул.Сурганова, д.53, Беларусь"
  },
  {
    id: 50103,
    city: "Минск",
    name: "СППС №50103",
    address: "г.Минск, ул.Казинца, д.121",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, ул.Казинца, д.121, Беларусь"
  },
  {
    id: 50104,
    city: "Минск",
    name: "СППС №50104",
    address: "г.Минск, пр-т Победителей, д.49",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, пр-т Победителей, д.49, Беларусь"
  },
  {
    id: 50105,
    city: "Минск",
    name: "СППС №50105",
    address: "г.Минск, ул.Янки Купалы, д.21",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, ул.Янки Купалы, д.21, Беларусь"
  },
  {
    id: 50106,
    city: "Минск",
    name: "СППС №50106",
    address: "г.Минск, ул.Притыцкого, д.76",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, ул.Притыцкого, д.76, Беларусь"
  },
  {
    id: 50107,
    city: "Минск",
    name: "СППС №50107",
    address: "г.Минск, ул.Ульяновская, д.30",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, ул.Ульяновская, д.30, Беларусь"
  },
  {
    id: 50108,
    city: "Минск",
    name: "СППС №50108",
    address: "г.Минск, ул.Хоружей, д.19",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, ул.Хоружей, д.19, Беларусь"
  },
  {
    id: 50109,
    city: "Минск",
    name: "СППС №50109",
    address: "г.Минск, ул.Петра Мстиславца, д.15",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, ул.Петра Мстиславца, д.15, Беларусь"
  },
  {
    id: 50110,
    city: "Минск",
    name: "СППС №50110",
    address: "г.Минск, ул.Жилуновича, д.7",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, ул.Жилуновича, д.7, Беларусь"
  },
  {
    id: 50111,
    city: "Минск",
    name: "СППС №50111",
    address: "г.Минск, ул.Энгельса, д.20",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, ул.Энгельса, д.20, Беларусь"
  },
  {
    id: 50112,
    city: "Минск",
    name: "СППС №50112",
    address: "г.Минск, пр-т Дзержинского, д.122",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, пр-т Дзержинского, д.122, Беларусь"
  },
  {
    id: 50113,
    city: "Минск",
    name: "СППС №50113",
    address: "г.Минск, ул.Кальварийская, д.7",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-17-355-00-00",
    delivery_address: "г.Минск, ул.Кальварийская, д.7, Беларусь"
  },

  // Мозырь
  {
    id: 80101,
    city: "Мозырь",
    name: "СППС №80101",
    address: "г.Мозырь, ул.Интернациональная, д.41",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-236-00-00-00",
    delivery_address: "г.Мозырь, ул.Интернациональная, д.41, Беларусь"
  },

  // Могилев
  {
    id: 60101,
    city: "Могилев",
    name: "СППС №60101",
    address: "г.Могилев, ул.Ленинская, д.31",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-222-00-00-00",
    delivery_address: "г.Могилев, ул.Ленинская, д.31, Беларусь"
  },
  {
    id: 60102,
    city: "Могилев",
    name: "СППС №60102",
    address: "г.Могилев, ул.Первомайская, д.42",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-222-00-00-00",
    delivery_address: "г.Могилев, ул.Первомайская, д.42, Беларусь"
  },
  {
    id: 60103,
    city: "Могилев",
    name: "СППС №60103",
    address: "г.Могилев, ул.Якубовского, д.20",
    working_hours: "Пн-Вс: с 10:00 до 20:00, обед с 14:00 до 14:30",
    phone: "+375-222-00-00-00",
    delivery_address: "г.Могилев, ул.Якубовского, д.20, Беларусь"
  },

  // Молодечно
  {
    id: 50101,
    city: "Молодечно",
    name: "СППС №50101",
    address: "г.Молодечно, ул.Янки Купалы, д.71",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-176-00-00-00",
    delivery_address: "г.Молодечно, ул.Янки Купалы, д.71, Беларусь"
  },

  // Новополоцк
  {
    id: 50101,
    city: "Новополоцк",
    name: "СППС №50101",
    address: "г.Новополоцк, ул.Юбилейная, д.7",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-214-00-00-00",
    delivery_address: "г.Новополоцк, ул.Юбилейная, д.7, Беларусь"
  },

  // Орша
  {
    id: 50101,
    city: "Орша",
    name: "СППС №50101",
    address: "г.Орша, ул.Ленина, д.45",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-216-00-00-00",
    delivery_address: "г.Орша, ул.Ленина, д.45, Беларусь"
  },

  // Пинск
  {
    id: 20101,
    city: "Пинск",
    name: "СППС №20101",
    address: "г.Пинск, ул.Заслонова, д.18",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-165-00-00-00",
    delivery_address: "г.Пинск, ул.Заслонова, д.18, Беларусь"
  },

  // Полоцк
  {
    id: 50101,
    city: "Полоцк",
    name: "СППС №50101",
    address: "г.Полоцк, ул.Коммунистическая, д.10",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-214-00-00-00",
    delivery_address: "г.Полоцк, ул.Коммунистическая, д.10, Беларусь"
  },

  // Речица
  {
    id: 80101,
    city: "Речица",
    name: "СППС №80101",
    address: "г.Речица, ул.Советская, д.15",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-234-00-00-00",
    delivery_address: "г.Речица, ул.Советская, д.15, Беларусь"
  },

  // Светлогорск
  {
    id: 80101,
    city: "Светлогорск",
    name: "СППС №80101",
    address: "г.Светлогорск, ул.Шакеса, д.27",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-234-00-00-00",
    delivery_address: "г.Светлогорск, ул.Шакеса, д.27, Беларусь"
  },

  // Слоним
  {
    id: 40101,
    city: "Слоним",
    name: "СППС №40101",
    address: "г.Слоним, ул.Зельвенская, д.17",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-156-00-00-00",
    delivery_address: "г.Слоним, ул.Зельвенская, д.17, Беларусь"
  },

  // Слуцк
  {
    id: 50101,
    city: "Слуцк",
    name: "СППС №50101",
    address: "г.Слуцк, ул.Ленина, д.78",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-179-00-00-00",
    delivery_address: "г.Слуцк, ул.Ленина, д.78, Беларусь"
  },

  // Сморгонь
  {
    id: 40101,
    city: "Сморгонь",
    name: "СППС №40101",
    address: "г.Сморгонь, ул.Янки Купалы, д.18",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-159-00-00-00",
    delivery_address: "г.Сморгонь, ул.Янки Купалы, д.18, Беларусь"
  },

  // Солигорск
  {
    id: 50101,
    city: "Солигорск",
    name: "СППС №50101",
    address: "г.Солигорск, ул.Заводская, д.20",
    working_hours: "Пн-Пт: с 10:00 до 18:00, обед с 14:00 до 14:30",
    phone: "+375-174-00-00-00",
    delivery_address: "г.Солигорск, ул.Заводская, д.20, Беларусь"
  }
];

// Улучшенная функция фильтрации городов
function findBestCityMatch(inputCity, pickupPoints) {
  if (!inputCity || !inputCity.trim()) {
    return pickupPoints;
  }

  const normalizedInput = inputCity.toLowerCase().trim();
  
  // Удаляем префиксы и общие слова
  const cleanInput = normalizedInput
    .replace(/^г\.?\s*/i, '')     // удаляем "г.", "г"
    .replace(/^город\s+/i, '')     // удаляем "город"
    .replace(/^п\.?\s*/i, '')     // удаляем "п.", "п" (поселок)
    .replace(/^с\.?\s*/i, '')     // удаляем "с.", "с" (село)
    .replace(/\s+беларусь$/i, '') // удаляем "беларусь" в конце
    .replace(/[,;].*$/, '')       // удаляем после запятой/точки с запятой
    .trim();

  // Получаем все уникальные города
  const uniqueCities = [...new Set(pickupPoints.map(point => point.city))];
  
  // Точное совпадение (максимальный приоритет)
  let exactMatches = uniqueCities.filter(city => 
    city.toLowerCase() === cleanInput
  );
  if (exactMatches.length > 0) {
    return pickupPoints.filter(point => 
      exactMatches.includes(point.city)
    );
  }

  // Частичное совпадение слов (высокий приоритет)
  let wordMatches = uniqueCities.filter(city => {
    const cleanCity = city.toLowerCase()
      .replace(/^г\.?\s*/i, '')
      .replace(/^город\s+/i, '');
    return cleanCity === cleanInput ||
           cleanInput.includes(cleanCity) ||
           cleanCity.includes(cleanInput);
  });
  if (wordMatches.length > 0) {
    return pickupPoints.filter(point => 
      wordMatches.includes(point.city)
    );
  }

  // Частичное совпадение символов (средний приоритет)
  let charMatches = uniqueCities.filter(city => {
    const cleanCity = city.toLowerCase()
      .replace(/^г\.?\s*/i, '')
      .replace(/^город\s+/i, '');
    return cleanInput.includes(cleanCity) || cleanCity.includes(cleanInput);
  });
  if (charMatches.length > 0) {
    return pickupPoints.filter(point => 
      charMatches.includes(point.city)
    );
  }

  // Нет совпадений - возвращаем точки по умолчанию (например, крупные города)
  return pickupPoints.filter(point => 
    ['Минск', 'Гомель', 'Витебск', 'Могилев', 'Гродно', 'Брест'].includes(point.city)
  );
}

// Расчет стоимости доставки по весу
function calculatePrice(weight) {
  if (weight <= 5.0) return 10.0;
  if (weight <= 10.0) return 12.0;
  if (weight <= 20.0) return 14.0;
  if (weight <= 30.0) return 16.0;
  if (weight <= 35.0) return 18.0;
  if (weight <= 40.0) return 20.0;
  if (weight <= 55.0) return 35.0;
  if (weight <= 90.0) return 50.0;
  if (weight <= 120.0) return 60.0;
  if (weight <= 149.0) return 70.0;
  if (weight <= 200.0) return 100.0;
  if (weight <= 250.0) return 150.0;
  return 200.0; // свыше 250кг
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
        'Content-Type': 'application/json'
      },
      body: ''
    };
  }

  try {
    // Обработка специальных запросов
    if (event.body) {
      const requestBody = JSON.parse(event.body);
      
      // Проверка на пинг/информационный запрос
      if (requestBody.action === 'ping' || requestBody.action === 'getCities' || 
          requestBody.ping === true || requestBody.get_cities === true) {
        
        const uniqueCities = [...new Set(pickupPoints.map(point => point.city))].sort();
        
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            success: true,
            message: 'InSales External Delivery API v2 - Avtolayt Express',
            cities: uniqueCities,
            pickup_points_count: pickupPoints.length,
            cities_count: uniqueCities.length,
            weight_ranges: {
              '5кг': 10.0,
              '10кг': 12.0,
              '20кг': 14.0,
              '30кг': 16.0,
              '35кг': 18.0,
              '40кг': 20.0,
              '55кг': 35.0,
              '90кг': 50.0,
              '120кг': 60.0,
              '149кг': 70.0,
              '200кг': 100.0,
              '250кг': 150.0,
              '250кг+': 200.0
            }
          })
        };
      }

      const { order } = requestBody;

      // Извлекаем город из разных возможных источников
      const fullLocalityName = order.shipping_address?.full_locality_name || '';
      const locationCity = order.shipping_address?.location?.city || '';
      const locationSettlement = order.shipping_address?.location?.settlement || '';
      const shippingCity = order.shipping_address?.city || '';
      
      // Пытаемся определить город по разным полям
      const city = fullLocalityName || locationCity || locationSettlement || shippingCity;
      
      // Получаем вес заказа
      const totalWeightStr = order.total_weight || '0';
      const totalWeight = parseFloat(totalWeightStr) || 0;

      // Улучшенная фильтрация ПВЗ по городу
      const filteredPoints = findBestCityMatch(city, pickupPoints);

      const tariffs = filteredPoints.map(point => {
        const price = calculatePrice(totalWeight);
        
        // Формируем полный адрес для full_locality_name
        const fullAddress = point.delivery_address || 
                           `${point.address}, ${point.city}, Беларусь`;

        // Основной ответ по формату InSales документации
        return {
          // Базовые поля тарифа
          id: point.id,                    // Добавляем id для pickup points
          tariff_id: `pvz_${point.id}`,    // Обязательное поле для множественных тарифов
          shipping_company_handle: 'autolight_express',
          price: price,
          currency: 'BYN',
          
          // Информация о доставке
          title: `${point.name}`,
          description: `${point.address} (${point.working_hours})`,
          
          // Интервал доставки
          delivery_interval: {
            min_days: 1,
            max_days: 1,
            description: `1 день`
          },
          
          // КРИТИЧНО: Правильный формат shipping_address по документации
          shipping_address: {
            // Это поле должно заполнить UI InSales
            full_locality_name: fullAddress,
            // Дополнительные поля адреса
            address: point.address,
            city: point.city,
            country: 'Беларусь',
            postal_code: '',
            
            // Дополнительная информация для pickup point
            pickup_point_name: point.name,
            pickup_point_hours: point.working_hours,
            pickup_point_phone: point.phone
          },
          
          // КРИТИЧНО: fields_values по официальному формату документации
          fields_values: [
            {
              // Поле для полного адреса в shipping_address
              handle: 'shipping_address[full_locality_name]',
              value: fullAddress,
              name: 'Полный адрес доставки'
            },
            {
              // Поле для заполнения адреса в UI (по документации InSales)
              handle: 'shipping_address[address]',
              value: point.address,
              name: 'Адрес доставки'
            },
            {
              // Альтернативный формат поля адреса
              handle: 'shipping_address_address',
              value: point.address
            },
            {
              // Дополнительное поле с полным адресом
              handle: 'full_locality_name',
              value: fullAddress
            },
            {
              // Простое поле адреса
              handle: 'address',
              value: fullAddress
            },
            {
              // Поле с ID pickup point
              handle: 'pickup_point_id',
              value: point.id.toString()
            },
            {
              // Поле с названием pickup point
              handle: 'pickup_point_name',
              value: point.name
            },
            {
              // Поле с городом
              handle: 'city',
              value: point.city
            },
            {
              // Поле со страной
              handle: 'country',
              value: 'Беларусь'
            },
            {
              // Поле с телефоном pickup point
              handle: 'pickup_point_phone',
              value: point.phone
            },
            {
              // Поле с рабочими часами
              handle: 'pickup_point_hours',
              value: point.working_hours
            }
          ]
        };
      });

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tariffs)
      };
    }

    // Если нет body или не JSON
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Invalid request format',
        errors: ['Request body must be valid JSON'],
        warnings: []
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Accept, Accept-Language, Content-Language, Content-Type',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message,
        errors: [error.message],
        warnings: []
      })
    };
  }
};
