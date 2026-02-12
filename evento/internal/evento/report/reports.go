package report

import (
	"bytes"
	"errors"
	"net/http"
	"strconv"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/tealeg/xlsx/v3"
	"gorm.io/gorm"
)

func allAutos(c echo.Context) error {
	// Fetch the company data
	var autos []model.Auto
	if err := db.Find(&autos).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Create a new Excel file
	file := xlsx.NewFile()
	// Create a new sheet
	sheet, _ := file.AddSheet("Autos Report")

	// Create styles for headers
	headerStyle := xlsx.NewStyle()
	headerStyle.Font.Bold = true
	headerStyle.Alignment.Horizontal = "center"
	headerStyle.Fill = *xlsx.NewFill("solid", "00D9E3F0", "")

	// Add headers with styles
	row := sheet.AddRow()
	addHeaderCell(row, "Номер", headerStyle)
	addHeaderCell(row, "Описание", headerStyle)
	addHeaderCell(row, "Тип", headerStyle)
	addHeaderCell(row, "Компания", headerStyle)

	// Add the company name and members to the sheet
	for _, auto := range autos {
		row = sheet.AddRow()
		addCell(row, auto.Number)
		addCell(row, auto.Description)
		addCell(row, auto.Type)
		addCell(row, auto.Company)
	}

	// Save the file as a byte array
	buffer := new(bytes.Buffer)
	file.Write(buffer)

	// Set the response headers for file download
	c.Response().Header().Set(echo.HeaderContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Response().Header().Set(echo.HeaderContentDisposition, "attachment; filename=members_report.xlsx")

	// Return the file content as a response
	return c.Blob(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer.Bytes())
}

func allUsers(c echo.Context) error {
	// Fetch the company data
	var users []model.User
	if err := db.Find(&users).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Create a new Excel file
	file := xlsx.NewFile()
	// Create a new sheet
	sheet, _ := file.AddSheet("Users Report")

	// Create styles for headers
	headerStyle := xlsx.NewStyle()
	headerStyle.Font.Bold = true
	headerStyle.Alignment.Horizontal = "center"
	headerStyle.Fill = *xlsx.NewFill("solid", "00D9E3F0", "")

	// Add headers with styles
	row := sheet.AddRow()
	addHeaderCell(row, "Логин", headerStyle)
	addHeaderCell(row, "Пароль", headerStyle)
	addHeaderCell(row, "Роль", headerStyle)

	// Add the company name and members to the sheet
	for _, user := range users {
		row = sheet.AddRow()
		addCell(row, user.Username)
		addCell(row, user.Password)
		addCell(row, user.Role)
	}

	// Save the file as a byte array
	buffer := new(bytes.Buffer)
	file.Write(buffer)

	// Set the response headers for file download
	c.Response().Header().Set(echo.HeaderContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Response().Header().Set(echo.HeaderContentDisposition, "attachment; filename=members_report.xlsx")

	// Return the file content as a response
	return c.Blob(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer.Bytes())
}

func allCompanies(c echo.Context) error {
	// Fetch the company data
	var companies []model.Company
	if err := db.Preload("AccreditationLimits").Preload("EventLimits").Preload("GateLimits").Find(&companies).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var allAccreditations []model.Accreditation
	if err := db.Order("position desc").Find(&allAccreditations).Error; err != nil {
		return c.String(http.StatusInternalServerError, "Error fetching accreditations: "+err.Error())
	}
	var allEvents []model.Event
	if err := db.Order("position desc").Find(&allEvents).Error; err != nil {
		return c.String(http.StatusInternalServerError, "Error fetching events: "+err.Error())
	}
	var allGates []model.Gate // Assuming all gates can have limits. Adjust if only 'additional' gates, etc.
	if err := db.Order("position desc").Find(&allGates).Error; err != nil {
		return c.String(http.StatusInternalServerError, "Error fetching gates: "+err.Error())
	}

	// Create a new Excel file
	file := xlsx.NewFile()
	// Create a new sheet
	sheet, _ := file.AddSheet("Companies Report")

	// Create styles for headers
	headerStyle := xlsx.NewStyle()
	headerStyle.Font.Bold = true
	headerStyle.Alignment.Horizontal = "center"
	headerStyle.Fill = *xlsx.NewFill("solid", "00D9E3F0", "")

	eventHeaderStyle := xlsx.NewStyle()
	eventHeaderStyle.Font.Bold = true
	eventHeaderStyle.Alignment.Horizontal = "center"
	eventHeaderStyle.Fill = *xlsx.NewFill("solid", "0064D2B3", "")

	gateHeaderStyle := xlsx.NewStyle()
	gateHeaderStyle.Font.Bold = true
	gateHeaderStyle.Alignment.Horizontal = "center"
	gateHeaderStyle.Fill = *xlsx.NewFill("solid", "00F6C177", "")

	accredHeaderStyle := xlsx.NewStyle()
	accredHeaderStyle.Font.Bold = true
	accredHeaderStyle.Alignment.Horizontal = "center"
	accredHeaderStyle.Fill = *xlsx.NewFill("solid", "00FFB84D", "")

	// Add headers with styles
	row := sheet.AddRow()
	addHeaderCell(row, "Название", headerStyle)
	addHeaderCell(row, "ИНН", headerStyle)
	addHeaderCell(row, "Описание", headerStyle)
	addHeaderCell(row, "Телефон", headerStyle)
	addHeaderCell(row, "Email", headerStyle)
	addHeaderCell(row, "Лимиты участников", headerStyle)
	addHeaderCell(row, "Лимиты автомобилей", headerStyle)
	addHeaderCell(row, "Маршрут по-умолчанию", headerStyle)

	// Add Accreditation Limit Headers
	for _, acc := range allAccreditations {
		addHeaderCell(row, acc.Name, accredHeaderStyle)
	}
	// Add Event Limit Headers
	for _, ev := range allEvents {
		addHeaderCell(row, ev.Name, eventHeaderStyle)
	}
	// Add Gate Limit Headers
	for _, gt := range allGates {
		addHeaderCell(row, gt.Name, gateHeaderStyle)
	}

	// Add the company name and members to the sheet
	for _, company := range companies {
		row = sheet.AddRow()
		addCell(row, company.Name)
		addCell(row, company.INN)
		addCell(row, company.Description)
		addCell(row, company.Phone)
		addCell(row, company.Email)
		addCell(row, company.MembersLimit)
		addCell(row, company.CarsLimit)
		addCell(row, company.DefaultRoute)

		// Populate Accreditation Limits
		accredLimitsMap := make(map[uuid.UUID]uint)
		for _, limit := range company.AccreditationLimits {
			accredLimitsMap[limit.AccreditationID] = limit.Limit
		}
		for _, acc := range allAccreditations {
			if limit, ok := accredLimitsMap[acc.ID]; ok {
				addCell(row, limit)
			} else {
				addCell(row, 0) // Or use an empty string: addCell(row, "")
			}
		}

		// Populate Event Limits
		eventLimitsMap := make(map[uuid.UUID]uint)
		for _, limit := range company.EventLimits {
			eventLimitsMap[limit.EventID] = limit.Limit
		}
		for _, ev := range allEvents {
			if limit, ok := eventLimitsMap[ev.ID]; ok {
				addCell(row, limit)
			} else {
				addCell(row, 0) // Or use an empty string
			}
		}

		// Populate Gate Limits
		gateLimitsMap := make(map[uuid.UUID]uint)
		for _, limit := range company.GateLimits {
			gateLimitsMap[limit.GateID] = limit.Limit
		}
		for _, gt := range allGates {
			if limit, ok := gateLimitsMap[gt.ID]; ok {
				addCell(row, limit)
			} else {
				addCell(row, 0) // Or use an empty string
			}
		}
	}

	// Save the file as a byte array
	buffer := new(bytes.Buffer)
	file.Write(buffer)

	// Set the response headers for file download
	c.Response().Header().Set(echo.HeaderContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Response().Header().Set(echo.HeaderContentDisposition, "attachment; filename=members_report.xlsx")

	// Return the file content as a response
	return c.Blob(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer.Bytes())
}

func allMembers(c echo.Context) error {
	// Fetch the company data
	var members []model.Member
	if err := db.Order("company_name asc").Preload("Company").Preload("Accreditation").Preload("Events").Preload("Gates").Find(&members).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	// Fetch limits
	var companyAccreditationLimits []model.CompanyAccreditationLimit
	var companyEventLimits []model.CompanyEventLimit
	var companyGateLimits []model.CompanyGateLimit

	db.Find(&companyAccreditationLimits)
	db.Find(&companyEventLimits)
	db.Find(&companyGateLimits)

	// Create a new Excel file
	file := xlsx.NewFile()
	// Create a new sheet
	sheet, _ := file.AddSheet("Members Report")

	// Create styles for headers
	headerStyle := xlsx.NewStyle()
	headerStyle.Font.Bold = true
	headerStyle.Alignment.Horizontal = "center"
	headerStyle.Fill = *xlsx.NewFill("solid", "00D9E3F0", "")

	eventHeaderStyle := xlsx.NewStyle()
	eventHeaderStyle.Font.Bold = true
	eventHeaderStyle.Alignment.Horizontal = "center"
	eventHeaderStyle.Fill = *xlsx.NewFill("solid", "0064D2B3", "")

	gateHeaderStyle := xlsx.NewStyle()
	gateHeaderStyle.Font.Bold = true
	gateHeaderStyle.Alignment.Horizontal = "center"
	gateHeaderStyle.Fill = *xlsx.NewFill("solid", "00F6C177", "")

	// Create style for exceeding limits
	exceedLimitStyle := xlsx.NewStyle()
	exceedLimitStyle.Fill = *xlsx.NewFill("solid", "00FF0000", "") // Red background

	// Add headers with styles
	row := sheet.AddRow()
	addHeaderCell(row, "Документ", headerStyle)
	addHeaderCell(row, "Фамилия", headerStyle)
	addHeaderCell(row, "Имя", headerStyle)
	addHeaderCell(row, "Отчество", headerStyle)
	addHeaderCell(row, "Дата рождения", headerStyle)
	addHeaderCell(row, "Ответственный", headerStyle)
	addHeaderCell(row, "Аккредитация", headerStyle)
	addHeaderCell(row, "Компания", headerStyle)
	addHeaderCell(row, "ИНН Компании", headerStyle)
	addHeaderCell(row, "Создан", headerStyle)

	var events []model.Event
	db.Order("position desc").Find(&events)
	for _, event := range events {
		addHeaderCell(row, event.Name, eventHeaderStyle)
	}

	var gates []model.Gate
	db.Order("position desc").Where("additional = ?", true).Find(&gates)
	for _, gate := range gates {
		addHeaderCell(row, gate.Name, gateHeaderStyle)
	}

	// Calculate and track limits
	accreditationCount := make(map[uuid.UUID]int)
	eventCount := make(map[uuid.UUID]map[uuid.UUID]int)
	gateCount := make(map[uuid.UUID]map[uuid.UUID]int)

	for _, member := range members {
		companyID := member.CompanyID

		// Increment accreditation count
		if _, exists := accreditationCount[companyID]; !exists {
			accreditationCount[companyID] = 0
		}
		accreditationCount[companyID]++

		// Increment event counts
		if _, exists := eventCount[companyID]; !exists {
			eventCount[companyID] = make(map[uuid.UUID]int)
		}
		for _, event := range member.Events {
			eventCount[companyID][event.ID]++
		}

		// Increment gate counts
		if _, exists := gateCount[companyID]; !exists {
			gateCount[companyID] = make(map[uuid.UUID]int)
		}
		for _, gate := range member.Gates {
			gateCount[companyID][gate.ID]++
		}
	}

	// Add the company name and members to the sheet
	for _, member := range members {
		row = sheet.AddRow()

		// Check if the member exceeds any limits
		exceedsLimit := false
		companyID := member.CompanyID

		// Check accreditation limit
		// for _, limit := range companyAccreditationLimits {
		// 	if limit.CompanyID == companyID && accreditationCount[companyID] > int(limit.Limit) {
		// 		exceedsLimit = true
		// 		break
		// 	}
		// }

		// Check event limits
		// for _, limit := range companyEventLimits {
		// 	if limit.CompanyID == companyID {
		// 		if count, exists := eventCount[companyID][limit.EventID]; exists && count > int(limit.Limit) {
		// 			exceedsLimit = true
		// 			break
		// 		}
		// 	}
		// }

		// Check gate limits
		for _, limit := range companyGateLimits {
			if limit.CompanyID == companyID {
				if count, exists := gateCount[companyID][limit.GateID]; exists && count > int(limit.Limit) {
					exceedsLimit = true
					break
				}
			}
		}

		// if exceedsLimit {
		// addHeaderCell(row, member.Document, exceedLimitStyle)
		// addHeaderCell(row, member.Surname, exceedLimitStyle)
		// addHeaderCell(row, member.Name, exceedLimitStyle)
		// addHeaderCell(row, member.Middlename, exceedLimitStyle)
		// addHeaderCell(row, strconv.FormatBool(member.Responsible), exceedLimitStyle)
		// addHeaderCell(row, member.Accreditation.Name, exceedLimitStyle)
		// addHeaderCell(row, member.Company, exceedLimitStyle)
		// addHeaderCell(row, member.CreatedAt, exceedLimitStyle)
		// }
		addCell(row, member.Document)
		addCell(row, member.Surname)
		addCell(row, member.Name)
		addCell(row, member.Middlename)
		addCell(row, member.Birth.Format("02.01.2006"))
		addCell(row, strconv.FormatBool(member.Responsible))
		addCell(row, member.Accreditation.Name)
		addCell(row, member.Company.Name)
		addCell(row, member.Company.INN)
		addCell(row, member.CreatedAt)

		// Add events
		for _, event := range events {
			cellValue := "FALSE"
			for _, memberEvent := range member.Events {
				if event.ID == memberEvent.ID {
					cellValue = "TRUE"
					break
				}
			}
			// if exceedsLimit {
			// 	addHeaderCell(row, cellValue, exceedLimitStyle)
			// }
			addCell(row, cellValue)
		}

		// Add gates
		for _, gate := range gates {
			cellValue := "FALSE"
			for _, memberGate := range member.Gates {
				if gate.ID == memberGate.ID {
					cellValue = "TRUE"
					break
				}
			}
			if exceedsLimit {
				addHeaderCell(row, cellValue, exceedLimitStyle)
			} else {
				addCell(row, cellValue)
			}
		}
	}

	// Save the file as a byte array
	buffer := new(bytes.Buffer)
	file.Write(buffer)

	// Set the response headers for file download
	c.Response().Header().Set(echo.HeaderContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Response().Header().Set(echo.HeaderContentDisposition, "attachment; filename=members_report.xlsx")

	// Return the file content as a response
	return c.Blob(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer.Bytes())
}

// Helper functions to add cells
func addCell(row *xlsx.Row, value interface{}) {
	cell := row.AddCell()
	cell.SetValue(value)
}

func addHeaderCell(row *xlsx.Row, value interface{}, style *xlsx.Style) {
	cell := row.AddCell()
	cell.SetValue(value)
	cell.SetStyle(style)
}
