package member

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/tealeg/xlsx/v3"
	"gorm.io/gorm"
)

func generateTemplate(c echo.Context) error {
	companyID, err := utils.ResolveCompanyIDForManage(c, db, c.QueryParam("company_id"))
	if err != nil {
		if httpErr, ok := err.(*echo.HTTPError); ok {
			return c.String(httpErr.Code, fmt.Sprint(httpErr.Message))
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// get company
	var company model.Company
	if err := db.Preload("AccreditationLimits").Preload("GateLimits").Preload("EventLimits").Preload("Members").First(&company, companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	// get accreditations, events, gates
	var accreditationsAll []model.Accreditation
	var accreditations []model.Accreditation
	if err := db.Order("position desc").Where("hidden = ?", false).Find(&accreditationsAll).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	for _, accredLimit := range company.AccreditationLimits {
		for _, accreditation := range accreditationsAll {
			if accreditation.ID == accredLimit.AccreditationID && accredLimit.Limit > 0 {
				accreditations = append(accreditations, accreditation)
			}
		}
	}
	var events []model.Event
	var eventsAll []model.Event
	if err := db.Order("position desc").Find(&eventsAll).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	for _, eventLimit := range company.EventLimits {
		for _, event := range eventsAll {
			if event.ID == eventLimit.EventID && eventLimit.Limit > 0 {
				events = append(events, event)
			}
		}
	}
	var gates []model.Gate
	var gatesAll []model.Gate
	if err := db.Order("position desc").Where("additional = ?", true).Find(&gatesAll).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	for _, gateLimit := range company.GateLimits {
		for _, gate := range gatesAll {
			if gate.ID == gateLimit.GateID && gateLimit.Limit > 0 {
				gates = append(gates, gate)
			}
		}
	}
	// fucking sort
	sort.Slice(accreditations, func(i, j int) bool {
		return accreditations[i].Position > accreditations[j].Position
	})
	sort.Slice(events, func(i, j int) bool {
		return events[i].Position > events[j].Position
	})
	sort.Slice(gates, func(i, j int) bool {
		return gates[i].Position > gates[j].Position
	})
	// Create a new Excel file
	file := xlsx.NewFile()

	// Create a new sheet
	sheet, _ := file.AddSheet("Участники")

	// Create styles for headers
	companyHeaderStyle := xlsx.NewStyle()
	companyHeaderStyle.Font.Bold = true
	companyHeaderStyle.Alignment.Horizontal = "center"
	companyHeaderStyle.Fill = *xlsx.NewFill("solid", "00D9E3F0", "")

	eventHeaderStyle := xlsx.NewStyle()
	eventHeaderStyle.Font.Bold = true
	eventHeaderStyle.Alignment.Horizontal = "center"
	eventHeaderStyle.Fill = *xlsx.NewFill("solid", "0064D2B3", "")

	gateHeaderStyle := xlsx.NewStyle()
	gateHeaderStyle.Font.Bold = true
	gateHeaderStyle.Alignment.Horizontal = "center"
	gateHeaderStyle.Fill = *xlsx.NewFill("solid", "00F6C177", "")

	// Create styles for headers
	exampleStyle := xlsx.NewStyle()
	exampleStyle.Font.Bold = true
	exampleStyle.Alignment.Horizontal = "center"
	exampleStyle.Fill = *xlsx.NewFill("solid", "00FDA4AF", "")

	sheet.SetColWidth(1, 6+len(events)+len(accreditations)+len(gates), float64(50))
	// Add headers with styles
	row := sheet.AddRow()
	addHeaderCell(row, "Серия, номер паспорта", companyHeaderStyle)
	addHeaderCell(row, "Фамилия", companyHeaderStyle)
	addHeaderCell(row, "Имя", companyHeaderStyle)
	addHeaderCell(row, "Отчество", companyHeaderStyle)
	addHeaderCell(row, "Дата рождения", companyHeaderStyle)
	addHeaderCell(row, "Ответственный", companyHeaderStyle)
	addHeaderCell(row, "Выберите вид аккредитации", companyHeaderStyle)

	// Define dropdown list values
	dropdownValues := []string{}
	for _, accreditation := range accreditations {
		dropdownValues = append(dropdownValues, accreditation.Name)
	}
	// count limits
	currentLimit := int(company.MembersLimit) - len(company.Members)
	// Create data validation for the dropdown list
	startRow, startCol, endRow, endCol := 1, 6, currentLimit, 6
	dataValidation := xlsx.NewDataValidation(startRow, startCol, endRow, endCol, true)
	dataValidation.SetDropList(dropdownValues)

	// Apply data validation to the cells in the specified range
	sheet.AddDataValidation(dataValidation)

	// Add events as checkboxes (their names) with eventHeaderStyle
	for _, event := range events {
		addHeaderCell(row, event.Name, eventHeaderStyle)
	}

	// Add accreditations as checkboxes (their names) with accreditationHeaderStyle
	for _, gate := range gates {
		addHeaderCell(row, gate.Name, gateHeaderStyle)
	}

	// Add example
	exampleRow := sheet.AddRow()
	addHeaderCell(exampleRow, "Пример: 4000123456", exampleStyle)
	addHeaderCell(exampleRow, "Ильин", exampleStyle)
	addHeaderCell(exampleRow, "Василий", exampleStyle)
	addHeaderCell(exampleRow, "Григорьевич", exampleStyle)
	addHeaderCell(exampleRow, "30.12.1985", exampleStyle)
	addHeaderCell(exampleRow, 1, exampleStyle)
	addHeaderCell(exampleRow, "Участник", exampleStyle)

	for range events {
		addHeaderCell(exampleRow, 1, exampleStyle)
	}

	for range gates {
		addHeaderCell(exampleRow, 1, exampleStyle)
	}

	// Save the file as a byte array
	buffer := new(bytes.Buffer)
	file.Write(buffer)

	cityIdentifier := utils.GetCityIdentifierFromRequest(c)
	companyNameSanitized := utils.SanitizeFilename(company.Name)
	filename := fmt.Sprintf("attachment; filename=%s_%s_members.xlsx", cityIdentifier, companyNameSanitized)

	// Set the response headers for file download
	c.Response().Header().Set(echo.HeaderContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Response().Header().Set(echo.HeaderContentDisposition, filename)

	// Return the file content as a response
	return c.Blob(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer.Bytes())
}

func addHeaderCell(row *xlsx.Row, value interface{}, style *xlsx.Style) {
	cell := row.AddCell()
	cell.SetValue(value)
	cell.SetStyle(style)
}

func importMembers(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}
	_, userRole := utils.GetUser(c)
	companyID, err := utils.ResolveCompanyIDForManage(c, db, c.QueryParam("company_id"))
	if err != nil {
		if httpErr, ok := err.(*echo.HTTPError); ok {
			return c.String(httpErr.Code, fmt.Sprint(httpErr.Message))
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Get the uploaded file from the request
	file, err := c.FormFile("file")
	if err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	defer src.Close()

	// Create a new Excel file from the uploaded file
	xlsxFile, err := xlsx.OpenReaderAt(src, file.Size)
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	sheet := xlsxFile.Sheets[0]

	var company model.Company
	// Загружаем компанию вместе со ВСЕМИ ее лимитами один раз для эффективности
	if err := db.Preload("Members").Preload("AccreditationLimits").Preload("EventLimits").Preload("GateLimits").First(&company, companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Создаем карты разрешенных для компании сущностей для быстрой проверки прав.
	// Это ключевое исправление: теперь мы будем проверять не только лимит, но и само право на использование.
	companyAllowedAccreditations := make(map[uuid.UUID]bool)
	for _, limit := range company.AccreditationLimits {
		companyAllowedAccreditations[limit.AccreditationID] = true
	}
	companyAllowedEvents := make(map[uuid.UUID]bool)
	for _, limit := range company.EventLimits {
		companyAllowedEvents[limit.EventID] = true
	}
	companyAllowedGates := make(map[uuid.UUID]bool)
	for _, limit := range company.GateLimits {
		companyAllowedGates[limit.GateID] = true
	}

	// Проверяем общий лимит на количество участников
	realMaxRow := 2
	for i := 2; i < sheet.MaxRow; i++ {
		row, err := sheet.Row(i)
		if err != nil {
			// Если строка не читается, возможно, это конец файла
			break
		}
		// Пустая первая ячейка означает конец данных
		if row.GetCell(0).Value == "" {
			break
		}
		realMaxRow++
	}

	maxReadRow := realMaxRow - 2 // Количество строк с данными (не включая заголовки)
	currentLimit := int(company.MembersLimit) - len(company.Members)
	if maxReadRow > currentLimit {
		return c.String(http.StatusBadRequest, fmt.Sprintf("Превышено количество загружаемых участников.\nТекущий лимит: %d, в файле: %d", currentLimit, maxReadRow))
	}

	// Загружаем все возможные аккредитации, мероприятия и зоны для сопоставления по имени
	var allAccreditations []model.Accreditation
	if userRole == "admin" {
		err = db.Order("position desc").Find(&allAccreditations).Error
	} else {
		err = db.Order("position desc").Where("hidden = ?", false).Find(&allAccreditations).Error
	}
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	accreditationMap := make(map[string]uuid.UUID)
	for _, accreditation := range allAccreditations {
		accreditationMap[accreditation.Name] = accreditation.ID
	}

	var allEvents []model.Event
	if err := db.Find(&allEvents).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var allGates []model.Gate
	if err := db.Find(&allGates).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var membersToCreate []model.Member
	var errorsList []string // Переименовано, чтобы не конфликтовать со стандартным пакетом errors

	headerRow, err := sheet.Row(0)
	if err != nil {
		return c.String(http.StatusBadRequest, "Не удалось прочитать строку с заголовками в файле.")
	}

	// Итерируемся по строкам с данными
	for i := 2; i < realMaxRow; i++ {
		row, _ := sheet.Row(i)
		if row == nil || row.GetCell(0).Value == "" {
			continue // Пропускаем пустые строки
		}

		// 1. Проверка АККРЕДИТАЦИИ
		accreditationName := row.GetCell(6).Value
		accreditationID, ok := accreditationMap[accreditationName]
		if !ok {
			errorsList = append(errorsList, fmt.Sprintf("Строка %d: Неизвестный тип аккредитации \"%s\"", i+1, accreditationName))
			continue
		}
		if _, allowed := companyAllowedAccreditations[accreditationID]; !allowed {
			errorsList = append(errorsList, fmt.Sprintf("Строка %d: Компания не имеет права назначать аккредитацию \"%s\"", i+1, accreditationName))
			continue
		}

		// 2. Проверка ДАТЫ РОЖДЕНИЯ
		birthDate, err := parseDate(row.GetCell(4))
		if err != nil {
			errorsList = append(errorsList, fmt.Sprintf("Строка %d: Некорректный формат даты рождения \"%s\". Используйте ДД.ММ.ГГГГ", i+1, row.GetCell(4).Value))
			continue
		}

		// 3. Сбор и проверка МЕРОПРИЯТИЙ и ЗОН
		var eventIDs, gateIDs []uuid.UUID
		hasPermissionError := false
		for j := 7; j < 7+len(allEvents)+len(allGates); j++ {
			if row.GetCell(j) != nil && row.GetCell(j).Value != "" {
				headerName := headerRow.GetCell(j).Value

				// Ищем среди мероприятий
				eventID := getEventIDByName(allEvents, headerName)
				if eventID != uuid.Nil {
					if _, allowed := companyAllowedEvents[eventID]; !allowed {
						errorsList = append(errorsList, fmt.Sprintf("Строка %d: Компания не имеет права назначать мероприятие \"%s\"", i+1, headerName))
						hasPermissionError = true
					}
					eventIDs = append(eventIDs, eventID)
				}

				// Ищем среди зон
				gateID := getGateIDByName(allGates, headerName)
				if gateID != uuid.Nil {
					if _, allowed := companyAllowedGates[gateID]; !allowed {
						errorsList = append(errorsList, fmt.Sprintf("Строка %d: Компания не имеет права назначать зону \"%s\"", i+1, headerName))
						hasPermissionError = true
					}
					gateIDs = append(gateIDs, gateID)
				}
			}
		}
		if hasPermissionError {
			continue // Если были ошибки прав, переходим к следующей строке
		}

		// 4. Формирование объекта участника
		member := model.Member{
			Document:        row.GetCell(0).Value,
			Surname:         row.GetCell(1).Value,
			Name:            row.GetCell(2).Value,
			Middlename:      row.GetCell(3).Value,
			Birth:           birthDate,
			Responsible:     parseBool(row.GetCell(5).Value),
			CompanyName:     company.Name,
			CompanyID:       companyID,
			AccreditationID: accreditationID,
		}

		// Предполагается, что эта функция корректно заполняет member.Events и member.Gates
		err = membersFillLite(c, &member, eventIDs, gateIDs)
		if err != nil {
			errorsList = append(errorsList, fmt.Sprintf("Строка %d: %s", i+1, err.Error()))
			continue
		}

		// 5. Проверка количественных ЛИМИТОВ
		// Эта проверка теперь вызывается только после того, как мы убедились, что права на сущности есть.
		// Мы передаем сюда уже накопленный список участников для создания + текущего.
		err = checkCompanyLimits(companyID, accreditationID, eventIDs, gateIDs, append(membersToCreate, member))
		if err != nil {
			errorsList = append(errorsList, fmt.Sprintf("Строка %d: %s", i+1, err.Error()))
			continue
		}

		membersToCreate = append(membersToCreate, member)
	}

	if len(errorsList) > 0 {
		// Используем map, чтобы убрать дубликаты ошибок
		uniqueErrors := make(map[string]bool)
		for _, e := range errorsList {
			uniqueErrors[e] = true
		}
		finalErrors := make([]string, 0, len(uniqueErrors))
		for e := range uniqueErrors {
			finalErrors = append(finalErrors, e)
		}
		sort.Strings(finalErrors)
		return c.String(http.StatusBadRequest, fmt.Sprintf("Некоторые участники не могут быть импортированы:\n\n%s", strings.Join(finalErrors, "\n")))
	}

	// Если ошибок нет, создаем всех участников в одной транзакции
	err = db.Transaction(func(tx *gorm.DB) error {
		for _, member := range membersToCreate {
			if err := tx.Create(&member).Error; err != nil {
				if strings.Contains(err.Error(), "UNIQUE") || strings.Contains(err.Error(), "duplicate key") {
					return fmt.Errorf("Участник %s %s %s с документом %s уже существует в базе", member.Surname, member.Name, member.Middlename, member.Document)
				}
				return fmt.Errorf("Не удалось создать участника %s %s %s: %w", member.Surname, member.Name, member.Middlename, err)
			}
			if member.Barcode == "" {
				barcode, barcodeErr := generateUniqueMemberBarcode(tx)
				if barcodeErr != nil {
					return fmt.Errorf("Не удалось сгенерировать штрихкод для участника %s %s %s: %w", member.Surname, member.Name, member.Middlename, barcodeErr)
				}
				member.Barcode = barcode
				if err := tx.Model(&model.Member{}).Where("id = ?", member.ID).Update("barcode", member.Barcode).Error; err != nil {
					return fmt.Errorf("Не удалось сгенерировать штрихкод для участника %s %s %s: %w", member.Surname, member.Name, member.Middlename, err)
				}
			}
			tx.Preload("Accreditation.Gates").Preload("Events").Preload("Gates").First(&member, member.ID)
			memberDetails, _ := json.Marshal(member)
			logMemberHistory(tx, c, member.ID, "create", string(memberDetails))
		}
		return nil
	})

	if err != nil {
		return c.String(http.StatusInternalServerError, "Не удалось импортировать участников: \n\n"+err.Error())
	}

	return c.String(http.StatusOK, fmt.Sprintf("Успешно импортировано участников: %d", len(membersToCreate)))
}

func parseBool(value string) bool {
	return value != ""
}

func parseUint(value string) uint {
	parsed, _ := strconv.ParseUint(value, 10, 64)
	return uint(parsed)
}

func getEventIDByName(events []model.Event, name string) uuid.UUID {
	for _, event := range events {
		if event.Name == name {
			return event.ID
		}
	}
	return uuid.Nil
}

func getGateIDByName(gates []model.Gate, name string) uuid.UUID {
	for _, gate := range gates {
		if gate.Name == name {
			return gate.ID
		}
	}
	return uuid.Nil
}

func parseDate(cell *xlsx.Cell) (time.Time, error) {
	// Try to get the date value directly if it's stored as a date
	if date, err := cell.GetTime(false); err == nil {
		return date, nil
	}

	// Fallback to parsing the cell's string value
	return time.Parse("02.01.2006", cell.String())
}

func checkCompanyLimits(companyID uuid.UUID, accreditationID uuid.UUID, eventIDs []uuid.UUID, gateIDs []uuid.UUID, newMembers []model.Member) error {
	var company model.Company
	if err := db.Preload("AccreditationLimits").Preload("EventLimits").Preload("GateLimits").First(&company, companyID).Error; err != nil {
		return err
	}

	// Check accreditation limit
	for _, limit := range company.AccreditationLimits {
		if limit.AccreditationID == accreditationID {
			var count int64
			if err := db.Model(&model.Member{}).Where("accreditation_id = ? AND company_id = ?", accreditationID, companyID).Count(&count).Error; err != nil {
				return err
			}
			// Add the number of new members with the same accreditation
			for _, member := range newMembers {
				if member.AccreditationID == accreditationID {
					count++
				}
			}
			if count >= int64(limit.Limit+1) {
				var accreditation model.Accreditation
				db.First(&accreditation, accreditationID)
				return fmt.Errorf("Достигнут лимит аккредитации '%s'. Лимит: %d", accreditation.Name, limit.Limit)
			}
		}
	}

	// Check event limits
	for _, eventID := range eventIDs {
		for _, limit := range company.EventLimits {
			if limit.EventID == eventID {
				var count int64
				if err := db.Model(&model.Member{}).
					Joins("JOIN member_events ON member_events.member_id = members.id").
					Where("member_events.event_id = ? AND members.company_id = ?", eventID, companyID).
					Count(&count).Error; err != nil {
					return err
				}
				// Add the number of new members with the same event
				for _, member := range newMembers {
					for _, event := range member.Events {
						if event.ID == eventID {
							count++
						}
					}
				}
				if count >= int64(limit.Limit+1) {
					var event model.Event
					db.First(&event, eventID)
					return fmt.Errorf("Достигнут лимит мероприятия '%s'. Лимит: %d", event.Name, limit.Limit)
				}
			}
		}
	}

	// Check gate limits
	for _, gateID := range gateIDs {
		for _, limit := range company.GateLimits {
			if limit.GateID == gateID {
				var count int64
				if err := db.Model(&model.Member{}).
					Joins("JOIN member_gates ON member_gates.member_id = members.id").
					Where("member_gates.gate_id = ? AND members.company_id = ?", gateID, companyID).
					Count(&count).Error; err != nil {
					return err
				}
				// Add the number of new members with the same gate
				for _, member := range newMembers {
					for _, gate := range member.Gates {
						if gate.ID == gateID {
							count++
						}
					}
				}
				if count >= int64(limit.Limit+1) {
					var gate model.Gate
					db.First(&gate, gateID)
					return fmt.Errorf("Достигнут лимит зоны '%s'. Лимит: %d", gate.Name, limit.Limit)
				}
			}
		}
	}

	return nil
}
