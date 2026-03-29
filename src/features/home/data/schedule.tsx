export type RawScheduleEvent = {
  time: string;
  title: string;
  description?: string;
  location?: string;
  category: string;
};

export type RawScheduleDay = {
  day: string;
  events: RawScheduleEvent[];
};

export const scheduleData: RawScheduleDay[] = [
  {
    day: "День 1 (Пятница, 3 апреля)",
    events: [
      {
        time: "08:00 - 09:00",
        title: "Регистрация участников",
        location: "Холл",
        category: "General",
      },
      {
        time: "09:00 - 10:00",
        title: "Торжественная церемония открытия",
        description:
          "Приветственное слово (Женысов Е.Б.), выступления танцевальной и музыкальной организаций МУИТ",
        category: "General",
      },
      {
        time: "10:00 - 10:30",
        title: "Разъяснение заданий",
        category: "Work",
      },
      {
        time: "11:00",
        title: "Первый чекпойнт",
        category: "Checkpoint",
      },
      {
        time: "11:00 - 12:00",
        title: "Мастер-класс: Робототехника и Биомедицинская инженерия",
        description:
          "Игембай Ерболат (PhD candidate). Тема: Как создаются протезы и экзоскелеты с ИИ",
        category: "Workshop",
      },
      {
        time: "12:00 - 13:00",
        title: "Мастер-класс: ИИ в сельском хозяйстве",
        description:
          "Ермеков Фараби (KazNARU). Тема: Анализ пространственно-временных данных",
        category: "Workshop",
      },
      {
        time: "13:00 - 13:30",
        title: "Мастер-класс: Запуск ИИ стартапов",
        description: "Акерке Татишева / Нуралы Бегалиев (VoiceClinic AI)",
        category: "Workshop",
      },
      {
        time: "13:00 - 14:00",
        title: "Обед",
        category: "Food",
      },
      {
        time: "14:00 - 14:30",
        title: "Мастер-класс: Навыки и профессии будущего",
        description: "Шукубаева Куралай (Qural.AI)",
        category: "Workshop",
      },
      {
        time: "14:30 - 15:00",
        title: "Мастер-класс: Путь в зарубежное IT-образование",
        description: "Асия Базаралиева (Q-Study International)",
        category: "Workshop",
      },
      {
        time: "15:00 - 15:30",
        title: "Мастер-класс: Обучение в США",
        description: "Oksana Knyaz (Green River College)",
        category: "Workshop",
      },
      {
        time: "15:30 - 16:30",
        title: "Мастер-класс: Программы Almaty Hub",
        description: "Калымбетова Райхан (Almaty Hub)",
        category: "Workshop",
      },
      {
        time: "16:30 - 17:30",
        title: "Мастер-класс: IT мертво. Да здравствует IT!",
        description: "Ернур Мелсов (Koz AI)",
        category: "Workshop",
      },
      {
        time: "17:00 - 18:00",
        title: "Второй чекпойнт",
        category: "Checkpoint",
      },
    ],
  },
  {
    day: "День 2 (Суббота, 4 апреля)",
    events: [
      {
        time: "09:00 - 11:00",
        title: "Третий чекпоинт / Работа над идеей",
        category: "Checkpoint",
      },
      {
        time: "11:30 - 17:00",
        title: "Четвертый чекпоинт & Демо проектов",
        description: "Демонстрация разработанных решений жюри и менторам",
        category: "Pitch",
      },
      {
        time: "13:00 - 14:00",
        title: "Обед",
        category: "Food",
      },
      {
        time: "17:00 - 18:00",
        title: "Работа жюри",
        category: "Jury",
      },
      {
        time: "19:00 - 21:00",
        title: "Официальное закрытие",
        location: "Main Stage",
        description: "Концертная программа и награждение победителей AITK HACKATHON 2026",
        category: "General",
      },
    ],
  },
];