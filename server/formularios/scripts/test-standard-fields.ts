/**
 * Test script for Standard Fields System
 * 
 * This script tests all 3 new endpoints:
 * 1. POST /api/form-templates/complete-registration - Create template
 * 2. POST /api/forms/from-template/:templateId - Clone form from template
 * 3. POST /api/forms/:formId/add-standard-fields - Add standard fields to form
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
}

async function testCreateTemplate(): Promise<TestResult> {
  try {
    console.log('\n📝 Test 1: Creating Complete Registration Template...');
    
    const response = await axios.post(`${API_BASE}/api/formularios/form-templates/complete-registration`);
    
    if (response.status === 201 && response.data) {
      console.log('✅ Template created successfully!');
      console.log(`   Template ID: ${response.data.id}`);
      console.log(`   Template Name: ${response.data.name}`);
      console.log(`   Total Fields: ${response.data.questions?.length || 0}`);
      
      return {
        success: true,
        message: 'Template created successfully',
        data: response.data
      };
    }
    
    return {
      success: false,
      message: 'Unexpected response format',
      data: response.data
    };
  } catch (error: any) {
    console.error('❌ Error creating template:', error.message);
    return {
      success: false,
      message: `Error creating template: ${error.message}`,
      error: error.response?.data || error.message
    };
  }
}

async function testCloneFormFromTemplate(templateId: string): Promise<TestResult> {
  try {
    console.log('\n📝 Test 2: Cloning form from template...');
    
    const response = await axios.post(
      `${API_BASE}/api/formularios/forms/from-template/${templateId}`,
      {
        title: 'Formulário de Teste - Cadastro Completo',
        description: 'Formulário clonado do template padrão',
        passingScore: 0
      }
    );
    
    if (response.status === 201 && response.data) {
      console.log('✅ Form cloned successfully!');
      console.log(`   Form ID: ${response.data.id}`);
      console.log(`   Form Title: ${response.data.title}`);
      console.log(`   Total Fields: ${response.data.questions?.length || 0}`);
      
      return {
        success: true,
        message: 'Form cloned successfully',
        data: response.data
      };
    }
    
    return {
      success: false,
      message: 'Unexpected response format',
      data: response.data
    };
  } catch (error: any) {
    console.error('❌ Error cloning form:', error.message);
    return {
      success: false,
      message: `Error cloning form: ${error.message}`,
      error: error.response?.data || error.message
    };
  }
}

async function testAddStandardFieldsToForm(formId: string): Promise<TestResult> {
  try {
    console.log('\n📝 Test 3: Adding standard fields to existing form...');
    
    const response = await axios.post(
      `${API_BASE}/api/formularios/forms/${formId}/add-standard-fields`
    );
    
    if (response.status === 200 && response.data) {
      console.log('✅ Standard fields added successfully!');
      console.log(`   Form ID: ${response.data.id}`);
      console.log(`   Total Fields: ${response.data.questions?.length || 0}`);
      
      return {
        success: true,
        message: 'Standard fields added successfully',
        data: response.data
      };
    }
    
    return {
      success: false,
      message: 'Unexpected response format',
      data: response.data
    };
  } catch (error: any) {
    console.error('❌ Error adding standard fields:', error.message);
    return {
      success: false,
      message: `Error adding standard fields: ${error.message}`,
      error: error.response?.data || error.message
    };
  }
}

async function testNoDuplicateCpfCnpj(formId: string): Promise<TestResult> {
  try {
    console.log('\n📝 Test 4: Verifying CPF/CNPJ is not duplicated...');
    
    // Add standard fields again - should not duplicate CPF/CNPJ
    const response = await axios.post(
      `${API_BASE}/api/formularios/forms/${formId}/add-standard-fields`
    );
    
    const questions = response.data.questions || [];
    const cpfCnpjFields = questions.filter((q: any) => 
      q.fieldType === 'cpf_cnpj' || 
      q.id === 'cpf_cnpj' ||
      q.title?.toLowerCase().includes('cpf') ||
      q.title?.toLowerCase().includes('cnpj')
    );
    
    console.log(`   Total CPF/CNPJ fields found: ${cpfCnpjFields.length}`);
    
    if (cpfCnpjFields.length === 1) {
      console.log('✅ CPF/CNPJ field not duplicated!');
      return {
        success: true,
        message: 'CPF/CNPJ field correctly prevented duplication',
        data: { cpfCnpjFieldCount: cpfCnpjFields.length }
      };
    } else {
      console.error(`❌ Found ${cpfCnpjFields.length} CPF/CNPJ fields (expected 1)`);
      return {
        success: false,
        message: `Found ${cpfCnpjFields.length} CPF/CNPJ fields instead of 1`,
        data: { cpfCnpjFieldCount: cpfCnpjFields.length }
      };
    }
  } catch (error: any) {
    console.error('❌ Error testing duplication:', error.message);
    return {
      success: false,
      message: `Error testing duplication: ${error.message}`,
      error: error.response?.data || error.message
    };
  }
}

async function createEmptyForm(): Promise<string | null> {
  try {
    console.log('\n📝 Creating empty form for testing...');
    
    const response = await axios.post(`${API_BASE}/api/formularios/forms`, {
      title: 'Formulário Vazio para Teste',
      description: 'Formulário sem campos para testar adição de campos padrão',
      questions: [],
      passingScore: 0
    });
    
    if (response.status === 201 && response.data) {
      console.log(`✅ Empty form created: ${response.data.id}`);
      return response.data.id;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Error creating empty form:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🧪 STANDARD FIELDS SYSTEM - Test Suite                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results: TestResult[] = [];
  
  // Test 1: Create template
  const templateResult = await testCreateTemplate();
  results.push(templateResult);
  
  if (!templateResult.success || !templateResult.data?.id) {
    console.error('\n❌ Cannot continue tests - template creation failed');
    process.exit(1);
  }
  
  const templateId = templateResult.data.id;
  
  // Test 2: Clone form from template
  const cloneResult = await testCloneFormFromTemplate(templateId);
  results.push(cloneResult);
  
  // Test 3: Add standard fields to empty form
  const emptyFormId = await createEmptyForm();
  if (emptyFormId) {
    const addFieldsResult = await testAddStandardFieldsToForm(emptyFormId);
    results.push(addFieldsResult);
    
    // Test 4: Verify no duplication
    if (addFieldsResult.success) {
      const noDuplicateResult = await testNoDuplicateCpfCnpj(emptyFormId);
      results.push(noDuplicateResult);
    }
  }
  
  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  📊 TEST RESULTS SUMMARY                                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${results.length}\n`);
  
  results.forEach((result, index) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.message}`);
  });
  
  console.log('\n');
  
  if (failed === 0) {
    console.log('🎉 All tests passed successfully!');
    process.exit(0);
  } else {
    console.log('⚠️ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Fatal error running tests:', error);
  process.exit(1);
});
