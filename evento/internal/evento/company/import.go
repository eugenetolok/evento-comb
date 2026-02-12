package company

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/tealeg/xlsx/v3"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func generateTemplate(c echo.Context) error {
	_, role := utils.GetUser(c)

	// Get accreditations and events from the database
	var accreditations []model.Accreditation
	var err error
	if role == "admin" {
		err = db.Order("position desc").Find(&accreditations).Error
	} else {
		err = db.Order("position desc").Where("hidden = ?", false).Find(&accreditations).Error
	}
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var events []model.Event
	if err := db.Order("position desc").Find(&events).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	var gates []model.Gate
	if err := db.Order("position desc").Where("additional = ?", true).Find(&gates).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	file := xlsx.NewFile()
	sheet, _ := file.AddSheet("Компании")

	companyHeaderStyle := xlsx.NewStyle()
	companyHeaderStyle.Font.Bold = true
	companyHeaderStyle.Alignment.Horizontal = "center"
	companyHeaderStyle.Fill = *xlsx.NewFill("solid", "00D9E3F0", "")

	accreditationHeaderStyle := xlsx.NewStyle()
	accreditationHeaderStyle.Font.Bold = true
	accreditationHeaderStyle.Alignment.Horizontal = "center"
	accreditationHeaderStyle.Fill = *xlsx.NewFill("solid", "00D1C4E9", "")

	eventHeaderStyle := xlsx.NewStyle()
	eventHeaderStyle.Font.Bold = true
	eventHeaderStyle.Alignment.Horizontal = "center"
	eventHeaderStyle.Fill = *xlsx.NewFill("solid", "0064D2B3", "")

	gateHeaderStyle := xlsx.NewStyle()
	gateHeaderStyle.Font.Bold = true
	gateHeaderStyle.Alignment.Horizontal = "center"
	gateHeaderStyle.Fill = *xlsx.NewFill("solid", "00F6C177", "")

	exampleStyle := xlsx.NewStyle()
	exampleStyle.Font.Bold = true
	exampleStyle.Alignment.Horizontal = "center"
	exampleStyle.Fill = *xlsx.NewFill("solid", "00FDA4AF", "")

	sectionRow := sheet.AddRow()
	sectionCell := sectionRow.AddCell()
	// Company data now has 8 columns (Name, INN, Desc, Phone, Email, CarsLimit, MembersLimit, DefaultRoute)
	const companyDataColumns = 8
	for x := 0; x < companyDataColumns-1; x++ {
		sectionRow.AddCell()
	}
	sectionCell.Value = "Данные о компании"
	sectionCell.SetStyle(companyHeaderStyle)
	sectionCell.Merge(companyDataColumns-1, 0)

	if len(events) > 0 {
		sectionCell = sectionRow.AddCell()
		sectionCell.Value = "Мероприятия"
		sectionCell.SetStyle(eventHeaderStyle)
		for x := 0; x < len(events)-1; x++ {
			sectionRow.AddCell()
		}
		sectionCell.Merge(len(events)-1, 0)
	}

	if len(accreditations) > 0 {
		sectionCell = sectionRow.AddCell()
		sectionCell.Value = "Аккредитации"
		sectionCell.SetStyle(accreditationHeaderStyle)
		for x := 0; x < len(accreditations)-1; x++ {
			sectionRow.AddCell()
		}
		sectionCell.Merge(len(accreditations)-1, 0)
	}

	if len(gates) > 0 {
		sectionCell = sectionRow.AddCell()
		sectionCell.Value = "Зоны доступа"
		sectionCell.SetStyle(gateHeaderStyle)
		for x := 0; x < len(gates)-1; x++ {
			sectionRow.AddCell()
		}
		sectionCell.Merge(len(gates)-1, 0)
	}

	sheet.SetColWidth(1, companyDataColumns+len(events)+len(accreditations)+len(gates)+1, float64(50))

	row := sheet.AddRow()
	addHeaderCell(row, "Название компании", companyHeaderStyle)
	addHeaderCell(row, "ИНН", companyHeaderStyle) // New INN Header
	addHeaderCell(row, "Описание", companyHeaderStyle)
	addHeaderCell(row, "Телефон", companyHeaderStyle)
	addHeaderCell(row, "Email", companyHeaderStyle)
	addHeaderCell(row, "Лимит автомобилей", companyHeaderStyle)
	addHeaderCell(row, "Лимит участников", companyHeaderStyle)
	addHeaderCell(row, "Маршрут по-умолчанию", companyHeaderStyle)

	for _, event := range events {
		addHeaderCell(row, event.Name, eventHeaderStyle)
	}
	for _, accreditation := range accreditations {
		addHeaderCell(row, accreditation.Name, accreditationHeaderStyle)
	}
	for _, gate := range gates {
		addHeaderCell(row, gate.Name, gateHeaderStyle)
	}

	exampleRow := sheet.AddRow()
	addHeaderCell(exampleRow, "ООО Ромашка", exampleStyle)
	addHeaderCell(exampleRow, "1234567890", exampleStyle) // Example INN
	addHeaderCell(exampleRow, "Уход за растениями", exampleStyle)
	addHeaderCell(exampleRow, "89998887766", exampleStyle)
	addHeaderCell(exampleRow, "info@romashka.local", exampleStyle)
	addHeaderCell(exampleRow, 15, exampleStyle)
	addHeaderCell(exampleRow, 5, exampleStyle)
	addHeaderCell(exampleRow, "1", exampleStyle) // DefaultRoute example

	for range events {
		addHeaderCell(exampleRow, 15, exampleStyle)
	}
	for range accreditations {
		addHeaderCell(exampleRow, 15, exampleStyle)
	}
	for range gates {
		addHeaderCell(exampleRow, 15, exampleStyle)
	}

	buffer := new(bytes.Buffer)
	file.Write(buffer)

	cityIdentifier := utils.GetCityIdentifierFromRequest(c)
	filename := fmt.Sprintf("attachment; filename=%s_companies.xlsx", cityIdentifier)

	c.Response().Header().Set(echo.HeaderContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Response().Header().Set(echo.HeaderContentDisposition, filename)
	return c.Blob(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer.Bytes())
}

func addHeaderCell(row *xlsx.Row, value interface{}, style *xlsx.Style) {
	cell := row.AddCell()
	cell.SetValue(value)
	cell.SetStyle(style)
}

func addCell(row *xlsx.Row, value interface{}) {
	cell := row.AddCell()
	cell.SetValue(value)
}

func importTemplate(c echo.Context) error {
	if !utils.CheckUserWritePermission(c, db) {
		return c.String(http.StatusBadRequest, "Ваш аккаунт работает в режиме только для чтения")
	}
	userID, _ := utils.GetUser(c)
	file, err := c.FormFile("file")
	if err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	src, err := file.Open()
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	defer src.Close()

	var accreditations []model.Accreditation
	if err := db.Order("position desc").Find(&accreditations).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	var events []model.Event
	if err := db.Order("position desc").Find(&events).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	var gates []model.Gate
	if err := db.Order("position desc").Where("additional = ?", true).Find(&gates).Error; err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}

	xlsxFile, err := xlsx.OpenReaderAt(src, file.Size)
	if err != nil {
		return c.String(http.StatusInternalServerError, err.Error())
	}
	sheet := xlsxFile.Sheets[0]

	// Column offsets based on the new template structure
	const companyNameCol = 0
	const innCol = 1
	const descriptionCol = 2
	const phoneCol = 3
	const emailCol = 4
	const carsLimitCol = 5
	const membersLimitCol = 6
	const defaultRouteCol = 7
	const eventsOffset = defaultRouteCol + 1 // Events start after default route
	accreditationsOffset := eventsOffset + len(events)
	gatesOffset := accreditationsOffset + len(accreditations)

	headerRow, err := sheet.Row(1) // Header row is the second row (index 1)
	if err != nil {
		return c.String(http.StatusInternalServerError, "Нет заголовков таблиц")
	}

	var importErrors []string
	var companiesToCreate []model.Company
	var usersToCreate []model.User
	var companyLimitsToCreate struct {
		accreditationLimits []model.CompanyAccreditationLimit
		eventLimits         []model.CompanyEventLimit
		gateLimits          []model.CompanyGateLimit
	}

	// Data starts from the 4th row (index 3), after section and header and example
	for i := 3; i < sheet.MaxRow; i++ {
		row, err := sheet.Row(i)
		if err != nil {
			importErrors = append(importErrors, fmt.Sprintf("Строка %d: Ошибка чтения строки: %s", i+1, err.Error()))
			continue
		}
		if row.GetCell(companyNameCol).Value == "" && row.GetCell(innCol).Value == "" { // Stop if both name and INN are empty
			break
		}

		companyName := row.GetCell(companyNameCol).Value
		inn := row.GetCell(innCol).Value
		if inn == "" {
			importErrors = append(importErrors, fmt.Sprintf("Строка %d (Компания: %s): ИНН не может быть пустым.", i+1, companyName))
			continue
		}

		company := model.Company{
			Name:         companyName,
			INN:          inn,
			Description:  row.GetCell(descriptionCol).Value,
			Phone:        row.GetCell(phoneCol).Value,
			Email:        row.GetCell(emailCol).Value,
			CarsLimit:    parseUint(row.GetCell(carsLimitCol).Value),
			MembersLimit: parseUint(row.GetCell(membersLimitCol).Value),
			DefaultRoute: row.GetCell(defaultRouteCol).Value,
			EditorID:     userID,
		}
		company.ID = uuid.New() // Pre-generate ID for associating limits and user

		tempAccredLimits := []model.CompanyAccreditationLimit{}
		for j := accreditationsOffset; j < accreditationsOffset+len(accreditations); j++ {
			if cellValue := row.GetCell(j).Value; cellValue != "" {
				accreditationID := getAccreditationIDByName(accreditations, headerRow.GetCell(j).Value)
				if accreditationID != uuid.Nil {
					limit, _ := strconv.Atoi(cellValue)
					tempAccredLimits = append(tempAccredLimits, model.CompanyAccreditationLimit{
						CompanyID:       company.ID,
						AccreditationID: accreditationID,
						Limit:           uint(limit),
					})
				}
			}
		}

		tempEventLimits := []model.CompanyEventLimit{}
		for j := eventsOffset; j < eventsOffset+len(events); j++ {
			if cellValue := row.GetCell(j).Value; cellValue != "" {
				eventID := getEventIDByName(events, headerRow.GetCell(j).Value)
				if eventID != uuid.Nil {
					limit, _ := strconv.Atoi(cellValue)
					tempEventLimits = append(tempEventLimits, model.CompanyEventLimit{
						CompanyID: company.ID,
						EventID:   eventID,
						Limit:     uint(limit),
					})
				}
			}
		}

		tempGateLimits := []model.CompanyGateLimit{}
		for j := gatesOffset; j < gatesOffset+len(gates); j++ {
			if cellValue := row.GetCell(j).Value; cellValue != "" {
				gateID := getGateIDByName(gates, headerRow.GetCell(j).Value)
				if gateID != uuid.Nil {
					limit, _ := strconv.Atoi(cellValue)
					tempGateLimits = append(tempGateLimits, model.CompanyGateLimit{
						CompanyID: company.ID,
						GateID:    gateID,
						Limit:     uint(limit),
					})
				}
			}
		}

		user := model.User{
			Username:  utils.GenerateRandomString(8),
			Password:  utils.GenerateRandomString(8), // Plain password, will be hashed in transaction
			Role:      "company",
			CompanyID: company.ID,
		}
		user.ID = uuid.New() // Pre-generate ID

		companiesToCreate = append(companiesToCreate, company)
		usersToCreate = append(usersToCreate, user)
		companyLimitsToCreate.accreditationLimits = append(companyLimitsToCreate.accreditationLimits, tempAccredLimits...)
		companyLimitsToCreate.eventLimits = append(companyLimitsToCreate.eventLimits, tempEventLimits...)
		companyLimitsToCreate.gateLimits = append(companyLimitsToCreate.gateLimits, tempGateLimits...)
	}

	if len(importErrors) > 0 {
		return c.String(http.StatusBadRequest, strings.Join(importErrors, "\n"))
	}

	// Perform database operations in a transaction
	err = db.Transaction(func(tx *gorm.DB) error {
		for i, company := range companiesToCreate {
			if err := tx.Create(&company).Error; err != nil {
				if strings.Contains(err.Error(), "UNIQUE constraint failed: companies.inn") {
					return fmt.Errorf("Строка %d: Компания с ИНН '%s' (Название: %s) уже существует.", i+4, company.INN, company.Name)
				}
				return fmt.Errorf("Строка %d: Ошибка создания компании %s: %s", i+4, company.Name, err.Error())
			}

			// Create related limits for this company
			for _, limit := range companyLimitsToCreate.accreditationLimits {
				if limit.CompanyID == company.ID { // Ensure limit is for current company
					if err := tx.Create(&limit).Error; err != nil {
						return fmt.Errorf("Строка %d: Ошибка создания лимита аккредитации для компании %s: %s", i+4, company.Name, err.Error())
					}
				}
			}
			for _, limit := range companyLimitsToCreate.eventLimits {
				if limit.CompanyID == company.ID {
					if err := tx.Create(&limit).Error; err != nil {
						return fmt.Errorf("Строка %d: Ошибка создания лимита мероприятия для компании %s: %s", i+4, company.Name, err.Error())
					}
				}
			}
			for _, limit := range companyLimitsToCreate.gateLimits {
				if limit.CompanyID == company.ID {
					if err := tx.Create(&limit).Error; err != nil {
						return fmt.Errorf("Строка %d: Ошибка создания лимита зоны для компании %s: %s", i+4, company.Name, err.Error())
					}
				}
			}

			// Create user for this company
			user := usersToCreate[i] // Assuming usersToCreate is in same order as companiesToCreate
			hashedPassword, hashErr := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
			if hashErr != nil {
				return fmt.Errorf("Строка %d: Ошибка хеширования пароля для пользователя компании %s: %s", i+4, company.Name, hashErr.Error())
			}
			user.Password = string(hashedPassword)
			if err := tx.Create(&user).Error; err != nil {
				return fmt.Errorf("Строка %d: Ошибка создания пользователя для компании %s: %s", i+4, company.Name, err.Error())
			}
			tx.Preload("User").Preload("AccreditationLimits").Preload("EventLimits").Preload("GateLimits").Preload("Members.Accreditation").Preload("Autos").First(&company, company.ID)
			companyDetails, _ := json.Marshal(company)
			logCompanyHistory(tx, c, company.ID, "create", string(companyDetails))
		}
		return nil
	})

	if err != nil {
		return c.String(http.StatusBadRequest, err.Error()) // Return detailed error from transaction
	}

	return c.String(http.StatusOK, "Компании успешно импортированы")
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

func getAccreditationIDByName(accreditations []model.Accreditation, name string) uuid.UUID {
	for _, accreditation := range accreditations {
		if accreditation.Name == name {
			return accreditation.ID
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
