package auto

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/eugenetolok/evento/pkg/model"
	"github.com/eugenetolok/evento/pkg/utils"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/tealeg/xlsx/v3"
	"gorm.io/gorm"
)

func generateTemplate(c echo.Context) error {
	companyID, err := uuid.Parse(c.QueryParam("company_id"))
	if err != nil {
		userID, _ := utils.GetUser(c)
		var user model.User
		if err := db.First(&user, userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
			}
			return c.String(http.StatusInternalServerError, err.Error())
		}
		if user.CompanyID == uuid.Nil {
			return c.String(http.StatusBadRequest, `{"error":"company not found"}`)
		}
		fmt.Println("jwt userID", userID, "user.CompanyID", user.CompanyID)
		companyID = user.CompanyID
	}
	var company model.Company
	if err := db.Preload("Autos").First(&company, companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}
	// Create a new Excel file
	file := xlsx.NewFile()

	// Create a new sheet
	sheet, _ := file.AddSheet("Автомобили")

	// Create styles for headers
	autoHeaderStyle := xlsx.NewStyle()
	autoHeaderStyle.Font.Bold = true
	autoHeaderStyle.Alignment.Horizontal = "center"
	autoHeaderStyle.Fill = *xlsx.NewFill("solid", "00D9E3F0", "")

	// Create styles for headers
	exampleStyle := xlsx.NewStyle()
	exampleStyle.Font.Bold = true
	exampleStyle.Alignment.Horizontal = "center"
	exampleStyle.Fill = *xlsx.NewFill("solid", "00FDA4AF", "")

	// make wide
	sheet.SetColWidth(1, 4, float64(50))

	// Add headers with styles
	row := sheet.AddRow()
	addHeaderCell(row, "Гос. номер", autoHeaderStyle)
	addHeaderCell(row, "Тип (\"Грузовой\" или \"Легковой\")", autoHeaderStyle)
	addHeaderCell(row, "Описание", autoHeaderStyle)

	// Add example
	exampleRow := sheet.AddRow()
	addHeaderCell(exampleRow, "Пример: А001АА01", exampleStyle)
	addHeaderCell(exampleRow, "Легковой", exampleStyle)
	addHeaderCell(exampleRow, "Водитель: Антонов Михаил Сергеевич", exampleStyle)

	// Define dropdown list values
	dropdownValues := []string{"Грузовой", "Легковой"}
	// count limits
	currentLimit := int(company.CarsLimit) - len(company.Autos)
	// Create data validation for the dropdown list
	startRow, startCol, endRow, endCol := 2, 1, currentLimit+1, 1
	dataValidation := xlsx.NewDataValidation(startRow, startCol, endRow, endCol, true)
	dataValidation.SetDropList(dropdownValues)

	// Apply data validation to the cells in the specified range
	sheet.AddDataValidation(dataValidation)

	// Save the file as a byte array
	buffer := new(bytes.Buffer)
	file.Write(buffer)

	cityIdentifier := utils.GetCityIdentifierFromRequest(c)
	companyNameSanitized := utils.SanitizeFilename(company.Name)
	filename := fmt.Sprintf("attachment; filename=%s_%s_autos.xlsx", cityIdentifier, companyNameSanitized)

	// Set the response headers for file download
	c.Response().Header().Set(echo.HeaderContentType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Response().Header().Set(echo.HeaderContentDisposition, filename)

	// Return the file content as a response
	return c.Blob(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer.Bytes())
}

func addHeaderCell(row *xlsx.Row, value string, style *xlsx.Style) {
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
	companyID, err := uuid.Parse(c.QueryParam("company_id"))
	if err != nil {
		userID, _ := utils.GetUser(c)
		var user model.User
		if err := db.First(&user, userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return c.String(http.StatusNotFound, `{"error":"user is not found"}`)
			}
			return c.String(http.StatusInternalServerError, err.Error())
		}
		if user.CompanyID == uuid.Nil {
			return c.String(http.StatusBadRequest, `{"error":"company not found"}`)
		}
		fmt.Println("jwt userID", userID, "user.CompanyID", user.CompanyID)
		companyID = user.CompanyID
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

	// Get the first sheet
	sheet := xlsxFile.Sheets[0]

	var company model.Company
	if err := db.Preload("Autos").First(&company, companyID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.String(http.StatusNotFound, `{"error":"company is not found"}`)
		}
		return c.String(http.StatusInternalServerError, err.Error())
	}

	maxReadRow := sheet.MaxRow - 1
	currentLimit := int(company.CarsLimit) - len(company.Autos)
	if maxReadRow > currentLimit {
		return c.String(http.StatusBadRequest, fmt.Sprintf(`{"error":"autos are over the limit, currentLimit: %d, maxRead: %d, company.CarsLimit: %d, len(company.Autos): %d"}`, currentLimit, maxReadRow, company.CarsLimit, len(company.Autos)))
	}

	// Iterate over the rows starting from the second row (assuming the first row contains headers)
	for i := 2; i < sheet.MaxRow; i++ {
		row, err := sheet.Row(i)
		if err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}

		autoType := "truck"
		if row.GetCell(1).Value == "Легковой" {
			autoType = "car"
		}

		// Create a new auto
		auto := model.Auto{
			Number:      row.GetCell(0).Value,
			Type:        autoType,
			Description: row.GetCell(2).Value,
			Route:       row.GetCell(3).Value,
			CompanyID:   companyID,
			Company:     company.Name,
		}
		if auto.Route == "" {
			auto.Route = company.DefaultRoute
		}

		// Save the auto to the database
		if err := db.Create(&auto).Error; err != nil {
			return c.String(http.StatusInternalServerError, err.Error())
		}
		autoDetails, _ := json.Marshal(auto)
		logAutoHistory(db, c, auto.ID, "create", string(autoDetails))
	}

	return c.String(http.StatusOK, "Template imported successfully")
}

func parseUint(value string) uint {
	parsed, _ := strconv.ParseUint(value, 10, 64)
	return uint(parsed)
}
