import express from 'express';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import { verifyToken } from '../middlewares/verifyToken.js';
import { isSuperAdmin } from '../middlewares/isSuperAdmin.js';

const exportcsv = express.Router();

// Helper function to format model name (first letter uppercase, rest lowercase)
const formatModelName = (name) => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

exportcsv.get('/:modelName', verifyToken, isSuperAdmin, async (req, res) => {
    try {
        let { modelName } = req.params;
        const query = req.query;
        
        // Format model name (first letter uppercase, rest lowercase)
        modelName = formatModelName(modelName);
        
        // Get the model
        let Model;
        try {
            Model = mongoose.model(modelName);
        } catch (error) {
            // If model not found, try to find a case-insensitive match
            const modelNames = mongoose.modelNames();
            const matchedModel = modelNames.find(name => 
                name.toLowerCase() === modelName.toLowerCase()
            );
            
            if (!matchedModel) {
                return res.status(404).json({ 
                    error: 'Model not found',
                    availableModels: modelNames
                });
            }
            
            Model = mongoose.model(matchedModel);
            modelName = matchedModel;
        }
        if (!Model) {
            return res.status(404).json({ error: 'Model not found' });
        }

        // Fetch data from the database
        const data = await Model.find(query).lean();
        
        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'No data found' });
        }

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(modelName);

        // Get all unique keys from all documents to create headers
        const headers = [];
        data.forEach(item => {
            Object.keys(item).forEach(key => {
                if (!headers.includes(key) && key !== '__v') {
                    headers.push(key);
                }
            });
        });

        // Add headers
        worksheet.addRow(headers);

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD3D3D3' }
        };

        // Add data rows
        data.forEach(item => {
            const row = [];
            headers.forEach(header => {
                // Handle nested objects and arrays
                let value = item[header];
                if (value && typeof value === 'object') {
                    if (Array.isArray(value)) {
                        value = value.join(', ');
                    } else if (value instanceof Date) {
                        value = value.toISOString();
                    } else if (value._id) {
                        value = value._id.toString();
                    } else {
                        value = JSON.stringify(value);
                    }
                }
                row.push(value || '');
            });
            worksheet.addRow(row);
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 0;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = Math.min(Math.max(maxLength, 10), 50); // Min width 10, max 50
        });

        // Set response headers for file download
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=${modelName}_export_${new Date().toISOString().split('T')[0]}.xlsx`
        );

        // Write the workbook to the response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error exporting to Excel:', error);
        res.status(500).json({ 
            error: 'Error exporting data to Excel',
            message: error.message 
        });
    }
});

exportcsv.get('/models/list', verifyToken, isSuperAdmin, (req, res) => {
    try {
        const models = mongoose.modelNames().map(name => ({
            name: name,
            lowercase: name.toLowerCase()
        }));
        res.json({ models });
    } catch (error) {
        console.error('Error fetching models:', error);
        res.status(500).json({ error: 'Error fetching models' });
    }
});

export default exportcsv;
