## Heap-таблицы и их идентификаторы

В Chatium физическое имя Heap-таблицы задаётся первым аргументом `Heap.Table('<id>', ...)`.

В этом проекте глобальная уникальность обеспечивается **3-символьным суффиксом** после последнего `_` в `<id>`. При изменениях важно обновлять:

- значение `<id>` в файле таблицы (`p/webinar-room/tables/*.ts`)
- все строковые `RefLink('<id>')`, которые на неё ссылаются

### Актуальные id

- **Episodes**: `webinar-room-episodes_N9v`
- **EpisodeForms**: `webinar-room-episode-forms_nQ2`
- **ChatBans**: `webinar-room-chat-bans_p7R`
- **Autowebinars**: `t_webinar_room_webinar_room_autowebinars_xT8`
- **AutowebinarSchedules**: `t_webinar_room_webinar_room_autowebinar_schedules_L0s`
- **FormSubmissions**: `t_webinar_room_webinar_room_form_submissions_V3c`
- **ScenarioEvents**: `t_webinar_room_webinar_room_scenario_events_u6D`
- **GlobalConfig**: `t_webinar_room_webinar_room_global_config_b1F`
