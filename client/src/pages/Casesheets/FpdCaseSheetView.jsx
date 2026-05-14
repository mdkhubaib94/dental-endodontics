import React, { useState, useEffect } from 'react';
import './Fpdview.css';

const FpdView = ({ caseData }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(!caseData);
    const [error, setError] = useState(null);
    const [enlargedImage, setEnlargedImage] = useState(null);
    const totalPages = 7;

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [currentPage]);

    useEffect(() => {
        // If caseData is passed as prop, use it directly
        if (caseData) {
            console.log('📦 Received caseData from prop:', caseData);
            setFormData(caseData);
            setLoading(false);
            return;
        }

        // Otherwise, try to fetch from localStorage (for direct navigation)
        const fetchCaseData = async () => {
            try {
                const token = localStorage.getItem('token');
                const id = localStorage.getItem('caseId');
                
                console.log('🔍 Fetching FPD case with ID:', id);
                
                if (!id) {
                    setError('No case ID found');
                    setLoading(false);
                    return;
                }

                const response = await fetch(`http://localhost:5000/api/fpd/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('📦 Full API Response:', data);
                    console.log('📄 Data to be stored (data.data):', data.data);
                    console.log('🔑 Keys in data.data:', data.data ? Object.keys(data.data) : 'none');
                    
                    setFormData(data.data || {});
                    
                    // Log sample field values after setting
                    setTimeout(() => {
                        console.log('✅ FormData after setState:', data.data);
                        console.log('🧪 Sample field check - facial_symmetry:', data.data?.facial_symmetry);
                    }, 100);
                } else {
                    setError('Failed to load case data');
                }

            } catch (err) {
                setError('Error loading case data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchCaseData();
    }, [caseData]);

    // Extract patient ID from caseData or fallback to localStorage
    const getPatientId = () => {
        return caseData?.patientId || formData?.patientId || localStorage.getItem('CurrentpatientId') || 'N/A';
    };

    // Update caseData for display if formData changes
    const displayCaseData = caseData || { patientId: getPatientId() };

    const getFieldValue = (name) => formData[name] || '';

    const handleNext = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrev = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    if (loading) {
        return (
            <div className="case-sheet-container">
                <div className="case-sheet">
                    <p style={{ textAlign: 'center', color: 'white' }}>Loading case data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="case-sheet-container">
                <div className="case-sheet">
                    <p style={{ textAlign: 'center', color: 'white' }}>{error}</p>
                </div>
            </div>
        );
    }

    const isLastPage = currentPage === totalPages;

    return (
        <div className="case-sheet-container">
            {enlargedImage && (
                <div
                    className="image-modal-overlay"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999,
                    }}
                    onClick={() => setEnlargedImage(null)}
                >
                    <img
                        src={enlargedImage}
                        alt="Enlarged"
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                            backgroundColor: '#fff',
                            padding: '8px',
                            borderRadius: '4px',
                        }}
                    />
                </div>
            )}

            <div className="case-sheet">
                <div style={{ position: 'relative', textAlign: 'center', marginBottom: 20, paddingLeft: '20px', paddingRight: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <img src="/images/logo.png" alt="SRM Dental College Logo" style={{ maxWidth: 120, height: 'auto', marginBottom: 10 }} />
                        <h2 style={{ margin: 0, fontSize: '2em' }}>SRM Dental College</h2>
                    </div>

                    {/* Patient Information Header */}
                    {(caseData?.patientName || caseData?.patientId) && (
                        <div style={{ 
                            position: 'absolute',
                            left: '20px',
                            top: '6px',
                            backgroundColor: 'rgba(38, 40, 107, 0.95)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            padding: '8px 15px',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            color: 'white',
                            fontSize: '0.8em'
                        }}>
                            <div style={{ textAlign: 'left' }}>
                                {caseData?.patientName && (
                                    <div style={{ marginBottom: '6px' }}>
                                        <strong>Patient Name:</strong> {caseData.patientName}
                                    </div>
                                )}
                                {caseData?.patientId && (
                                    <div>
                                        <strong>Patient ID:</strong> {caseData.patientId}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Page 0: Clinical Examination - Extra Oral / TMJ */}
                <div className={`page ${currentPage === 0 ? 'active' : ''}`}>
                    <h2>1. Clinical examination:</h2>
                    <h3>A. Extra oral examination:</h3>
                    <div className="form-group">
                        <label>a) Facial symmetry:</label>
                        <div className="readonly-field">{getFieldValue('facial_symmetry')}</div>
                    </div>
                    <div className="form-group">
                        <label>b) Facial profile: (Angle's classification)</label>
                        <div className="readonly-field">{getFieldValue('facial_profile')}</div>
                    </div>
                    <div className="form-group">
                        <label>c) Facial form: (House and Loop, Frush and Fischer, Leon Williams)</label>
                        <div className="readonly-field">{getFieldValue('facial_form')}</div>
                    </div>
                    <h3>d) TMJ examination:</h3>
                    <h4>1. Inspection:</h4>
                    <div className="form-group">
                        <label>a) Maximum mouth opening:</label>
                        <div className="readonly-field">{getFieldValue('max_mouth_opening')}</div>
                    </div>
                    <div className="form-group">
                        <label>b) Deviation of mandible:</label>
                        <div className="readonly-field">{getFieldValue('deviation_mandible')}</div>
                    </div>
                    <div className="form-group">
                        <label>Opening:</label>
                        <div className="readonly-field">{getFieldValue('deviation_opening')}</div>
                    </div>
                    <div className="form-group">
                        <label>Closing:</label>
                        <div className="readonly-field">{getFieldValue('deviation_closing')}</div>
                    </div>
                    <h4>2. Palpation:</h4>
                    <div className="form-group">
                        <label>a) Pain/tenderness:</label>
                        <div className="readonly-field">{getFieldValue('pain_tenderness')}</div>
                    </div>
                    <div className="form-group">
                        <label>b) Clicking:</label>
                        <div className="readonly-field">{getFieldValue('clicking')}</div>
                    </div>
                    <h4>3. Auscultation:</h4>
                    <div className="form-group">
                        <label>a) Crepitus:</label>
                        <div className="readonly-field">{getFieldValue('crepitus')}</div>
                    </div>
                    <div className="form-group">
                        <label>a) Lymph nodes:</label>
                        <div className="readonly-field">{getFieldValue('lymph_nodes')}</div>
                    </div>
                </div>

                {/* Page 1: Intraoral Examination / Tongue / Saliva */}
                <div className={`page ${currentPage === 1 ? 'active' : ''}`}>
                    <h2>Oral Examination Form</h2>
                    <h3>A. Extraoral Examination:</h3>
                    <div className="form-group">
                        <label>b) Lips:</label>
                        <div className="readonly-field">{getFieldValue('lips_b')}</div>
                    </div>
                    <div className="form-group">
                        <label>Competency:</label>
                        <div className="readonly-field">{getFieldValue('competency')}</div>
                    </div>
                    <div className="form-group">
                        <label>Lip length:</label>
                        <div className="readonly-field">{getFieldValue('lip_length')}</div>
                    </div>
                    <div className="form-group">
                        <label>Lip line:</label>
                        <div className="readonly-field">{getFieldValue('lip_line')}</div>
                    </div>
                    <div className="form-group">
                        <label>Pathology if any:</label>
                        <div className="readonly-field">{getFieldValue('pathology_any')}</div>
                    </div>
                    <div className="form-group">
                        <label>c) Extra oral muscle tone: (M.M. House classification)</label>
                        <div className="readonly-field">{getFieldValue('muscle_tone')}</div>
                    </div>

                    <h3>B. Intraoral examination:</h3>
                    <div className="form-group">
                        <label>a) Buccal mucosa:</label>
                    </div>
                    <div className="form-group">
                        <label>Colour:</label>
                        <div className="readonly-field">{getFieldValue('buccal_mucosa_colour')}</div>
                    </div>
                    <div className="form-group">
                        <label>Texture:</label>
                        <div className="readonly-field">{getFieldValue('buccal_mucosa_texture')}</div>
                    </div>
                    <div className="form-group">
                        <label>Others:</label>
                        <div className="readonly-field">{getFieldValue('buccal_mucosa_others')}</div>
                    </div>
                    <div className="form-group">
                        <label>b) Floor of the mouth:</label>
                    </div>
                    <div className="form-group">
                        <label>Colour:</label>
                        <div className="readonly-field">{getFieldValue('floor_mouth_colour')}</div>
                    </div>
                    <div className="form-group">
                        <label>Others:</label>
                        <div className="readonly-field">{getFieldValue('floor_mouth_others')}</div>
                    </div>
                    <div className="form-group">
                        <label>c) Hard palate:</label>
                    </div>
                    <div className="form-group">
                        <label>High arched/normal:</label>
                        <div className="readonly-field">{getFieldValue('hard_palate_arch')}</div>
                    </div>
                    <div className="form-group">
                        <label>Tori:</label>
                        <div className="readonly-field">{getFieldValue('hard_palate_tori')}</div>
                    </div>
                    <div className="form-group">
                        <label>Hyperplasia:</label>
                        <div className="readonly-field">{getFieldValue('hard_palate_hyperplasia')}</div>
                    </div>
                    <div className="form-group">
                        <label>Inflammation:</label>
                        <div className="readonly-field">{getFieldValue('hard_palate_inflammation')}</div>
                    </div>
                    <div className="form-group">
                        <label>Others:</label>
                        <div className="readonly-field">{getFieldValue('hard_palate_others')}</div>
                    </div>
                    <div className="form-group">
                        <label>d) Soft palate:</label>
                    </div>
                    <div className="form-group">
                        <label>Soft palatal form (Sheldon Winkler)</label>
                        <div className="readonly-field">{getFieldValue('soft_palate_form')}</div>
                    </div>
                    <div className="form-group">
                        <label>Colour:</label>
                        <div className="readonly-field">{getFieldValue('soft_palate_colour')}</div>
                    </div>
                    <div className="form-group">
                        <label>Others:</label>
                        <div className="readonly-field">{getFieldValue('soft_palate_others')}</div>
                    </div>
                </div>

                {/* Page 2: Tongue / Saliva / Gingival Index */}
                <div className={`page ${currentPage === 2 ? 'active' : ''}`}>
                    <div className="form-group">
                        <label>e) Tongue:</label>
                    </div>
                    <div className="form-group">
                        <label>Size:</label>
                        <div className="readonly-field">{getFieldValue('tongue_size')}</div>
                    </div>
                    <div className="form-group">
                        <label>Tongue position (Wright's Classification):</label>
                        <div className="readonly-field">{getFieldValue('tongue_position')}</div>
                    </div>
                    <div className="form-group">
                        <label>Mobility:</label>
                        <div className="readonly-field">{getFieldValue('tongue_mobility')}</div>
                    </div>
                    <div className="form-group">
                        <label>Others:</label>
                        <div className="readonly-field">{getFieldValue('tongue_others')}</div>
                    </div>
                    <div className="form-group">
                        <label>f) Saliva: (M.M. House classification)</label>
                        <div className="readonly-field">{getFieldValue('saliva')}</div>
                    </div>
                    <div className="form-group"><label>g) Gingival index: (Loe and Silness)</label></div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'center' }} colSpan="5">Distal</th>
                                    <th style={{ textAlign: 'center' }} colSpan="5">Mesial</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>Buccal</td>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <td key={`buccal_input_${i}`}>{getFieldValue(`buccal_input_${i}`)}</td>)}
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}>Palatal</td>
                                    <td colSpan="3">{getFieldValue('palatal_input_1')}</td>
                                    <td colSpan="3">{getFieldValue('palatal_input_2')}</td>
                                    <td colSpan="3">{getFieldValue('palatal_input_3')}</td>
                                </tr>
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center' }}>16</td>
                                    <td colSpan="3" style={{ textAlign: 'center' }}>12</td>
                                    <td colSpan="3" style={{ textAlign: 'center' }}>24</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'center' }} colSpan="5">Distal</th>
                                    <th style={{ textAlign: 'center' }} colSpan="5">Mesial</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Buccal</td>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => <td key={`buccal_field_${i}`}>{getFieldValue(`buccal_field_${i}`)}</td>)}
                                </tr>
                                <tr>
                                    <td>Lingual</td>
                                    <td colSpan="3">{getFieldValue('lingual_field_1')}</td>
                                    <td colSpan="3">{getFieldValue('lingual_field_2')}</td>
                                    <td colSpan="3">{getFieldValue('lingual_field_3')}</td>
                                </tr>
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center' }}>36</td>
                                    <td colSpan="3" style={{ textAlign: 'center' }}>32</td>
                                    <td colSpan="3" style={{ textAlign: 'center' }}>44</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="form-group"><label>Calculations:</label></div>
                    <div className="form-group">
                        <label>Gingival index =</label>
                        <div className="readonly-field">{getFieldValue('gingival_index')}</div>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Interpretation</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>Mild gingivitis</td><td>0.1 to 1.0</td></tr>
                                <tr><td>Moderate gingivitis</td><td>1.1 to 2.0</td></tr>
                                <tr><td>Severe gingivitis</td><td>2.1 to 3.0</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Page 3: OHI-S / DMF / Periodontal Status */}
                <div className={`page ${currentPage === 3 ? 'active' : ''}`}>
                    <div className="form-group"><label>h) Oral hygiene index - Simplified: (Green and Vermillion)</label></div>
                    <div className="form-group"><label>i. Debris score =</label></div>
                    <div className="table-container">
                        <table className="data-table">
                            <tbody>
                                <tr><td style={{ textAlign: 'center' }}>16</td><td style={{ textAlign: 'center' }}>11</td><td style={{ textAlign: 'center' }}>26</td></tr>
                                <tr>
                                    <td>{getFieldValue('debris_score_16_top')}</td>
                                    <td>{getFieldValue('debris_score_11_top')}</td>
                                    <td>{getFieldValue('debris_score_26_top')}</td>
                                </tr>
                                <tr>
                                    <td>{getFieldValue('debris_score_16_bottom')}</td>
                                    <td>{getFieldValue('debris_score_11_bottom')}</td>
                                    <td>{getFieldValue('debris_score_26_bottom')}</td>
                                </tr>
                                <tr><td style={{ textAlign: 'center' }}>46</td><td style={{ textAlign: 'center' }}>31</td><td style={{ textAlign: 'center' }}>36</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="form-group"><label>ii. Calculus score =</label></div>
                    <div className="table-container">
                        <table className="data-table">
                            <tbody>
                                <tr><td style={{ textAlign: 'center' }}>16</td><td style={{ textAlign: 'center' }}>11</td><td style={{ textAlign: 'center' }}>26</td></tr>
                                <tr>
                                    <td>{getFieldValue('calculus_score_16_top')}</td>
                                    <td>{getFieldValue('calculus_score_11_top')}</td>
                                    <td>{getFieldValue('calculus_score_26_top')}</td>
                                </tr>
                                <tr>
                                    <td>{getFieldValue('calculus_score_16_bottom')}</td>
                                    <td>{getFieldValue('calculus_score_11_bottom')}</td>
                                    <td>{getFieldValue('calculus_score_26_bottom')}</td>
                                </tr>
                                <tr><td style={{ textAlign: 'center' }}>46</td><td style={{ textAlign: 'center' }}>31</td><td style={{ textAlign: 'center' }}>36</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="form-group">
                        <label>Oral hygiene index-S = Debris index-s + Calculus index-s =</label>
                        <div className="readonly-field">{getFieldValue('oral_hygiene_index_s')}</div>
                    </div>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr><th>Interpretation</th><th></th></tr>
                            </thead>
                            <tbody>
                                <tr><td>Good</td><td>0.0 to 1.2</td></tr>
                                <tr><td>Fair</td><td>1.3 to 3.0</td></tr>
                                <tr><td>Poor</td><td>3.1 to 6.0</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="form-group"><label>i) DMF index: (H.T. Klein, C.E. Palmer, J.W. Knutson)</label></div>
                    <div className="table-container">
                        <table className="data-table">
                            <tbody>
                                <tr>
                                    <td>MAX</td>
                                    {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <td key={`max_${num}`}>{getFieldValue(`max_${num}`)}</td>)}
                                </tr>
                                <tr>
                                    <td></td>
                                    {[8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => <td key={`max_num_${idx}`} style={{ textAlign: 'center' }}>{num}</td>)}
                                </tr>
                                <tr>
                                    <td>MAND</td>
                                    {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <td key={`mand_${num}`}>{getFieldValue(`mand_${num}`)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="form-group"><label>j) Periodontal status of the existing dentition:</label></div>
                    <div className="form-group"><label>Mobility (Miller's Classification):</label></div>
                    <div className="table-container">
                        <table className="data-table">
                            <tbody>
                                <tr>
                                    <td>MAX</td>
                                    {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <td key={`mobility_max_${num}`}>{getFieldValue(`mobility_max_${num}`)}</td>)}
                                </tr>
                                <tr>
                                    <td></td>
                                    {[8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => <td key={`mobility_max_num_${idx}`} style={{ textAlign: 'center' }}>{num}</td>)}
                                </tr>
                                <tr>
                                    <td>MAND</td>
                                    {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <td key={`mobility_mand_${num}`}>{getFieldValue(`mobility_mand_${num}`)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Page 4: Furcation / Recession / Pockets / Tooth Loss */}
                <div className={`page ${currentPage === 4 ? 'active' : ''}`}>
                    <div className="form-group"><label>Furcation involvement (Glickman's Classification):</label></div>
                    <div className="table-container">
                        <table className="data-table">
                            <tbody>
                                <tr>
                                    <td>MAX</td>
                                    {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <td key={`furcation_max_${num}`}>{getFieldValue(`furcation_max_${num}`)}</td>)}
                                </tr>
                                <tr>
                                    <td></td>
                                    {[8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => <td key={`furcation_max_num_${idx}`} style={{ textAlign: 'center' }}>{num}</td>)}
                                </tr>
                                <tr>
                                    <td>MAND</td>
                                    {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <td key={`furcation_mand_${num}`}>{getFieldValue(`furcation_mand_${num}`)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="form-group"><label>Recession (Miller's Classification):</label></div>
                    <div className="table-container">
                        <table className="data-table">
                            <tbody>
                                <tr>
                                    <td>MAX</td>
                                    {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <td key={`recession_max_${num}`}>{getFieldValue(`recession_max_${num}`)}</td>)}
                                </tr>
                                <tr>
                                    <td></td>
                                    {[8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => <td key={`recession_max_num_${idx}`} style={{ textAlign: 'center' }}>{num}</td>)}
                                </tr>
                                <tr>
                                    <td>MAND</td>
                                    {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <td key={`recession_mand_${num}`}>{getFieldValue(`recession_mand_${num}`)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="form-group"><label>Periodontal pockets (in mm)</label></div>
                    <div className="table-container">
                        <table className="data-table">
                            <tbody>
                                <tr>
                                    <td>MAX</td>
                                    {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(num => <td key={`pocket_max_${num}`}>{getFieldValue(`pocket_max_${num}`)}</td>)}
                                </tr>
                                <tr>
                                    <td></td>
                                    {[8, 7, 6, 5, 4, 3, 2, 1, 1, 2, 3, 4, 5, 6, 7, 8].map((num, idx) => <td key={`pocket_max_num_${idx}`} style={{ textAlign: 'center' }}>{num}</td>)}
                                </tr>
                                <tr>
                                    <td>MAND</td>
                                    {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(num => <td key={`pocket_mand_${num}`}>{getFieldValue(`pocket_mand_${num}`)}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="form-group">
                        <label>Others periodontal findings:</label>
                        <div className="readonly-field">{getFieldValue('other_periodontal_findings')}</div>
                    </div>
                    <div className="form-group">
                        <label>k) Loss of tooth structure:</label>
                    </div>
                    <div className="checkbox-group-view">
                        {getFieldValue('tooth_loss_abrasion') && <span className="checkbox-item-view">✓ Abrasion</span>}
                        {getFieldValue('tooth_loss_occlusal_wear') && <span className="checkbox-item-view">✓ Occlusal wear / attrition</span>}
                        {getFieldValue('tooth_loss_erosion') && <span className="checkbox-item-view">✓ Erosion</span>}
                        {getFieldValue('tooth_loss_abfraction') && <span className="checkbox-item-view">✓ Abfraction</span>}
                        {!getFieldValue('tooth_loss_abrasion') && !getFieldValue('tooth_loss_occlusal_wear') && !getFieldValue('tooth_loss_erosion') && !getFieldValue('tooth_loss_abfraction') && <span>None selected</span>}
                    </div>
                </div>

                {/* Page 5: Edentulous Ridge / Occlusion */}
                <div className={`page ${currentPage === 5 ? 'active' : ''}`}>
                    <div className="form-group"><label>l) Anatomic and functional status of edentulous ridge:</label></div>
                    <div className="form-group">
                        <label>Mucosa:</label>
                        <div className="readonly-field">{getFieldValue('mucosa')}</div>
                    </div>
                    <div className="form-group">
                        <label>Colour:</label>
                        <div className="readonly-field">{getFieldValue('mucosa_colour')}</div>
                    </div>
                    <div className="form-group">
                        <label>Consistency:</label>
                        <div className="readonly-field">{getFieldValue('mucosa_consistency')}</div>
                    </div>
                    <div className="form-group">
                        <label>Thickness:</label>
                        <div className="readonly-field">{getFieldValue('mucosa_thickness')}</div>
                    </div>
                    <div className="form-group"><label>Ridge classification (Siebert's classification):</label></div>
                    <div className="form-group">
                        <div className="readonly-field">{getFieldValue('ridge_classification')}</div>
                    </div>
                    <div className="form-group">
                        <label>Height of the ridge:</label>
                        <div className="readonly-field">{getFieldValue('ridge_height')}</div>
                    </div>
                    <div className="form-group">
                        <label>Length (mesio distal):</label>
                        <div className="readonly-field">{getFieldValue('ridge_length')}</div>
                    </div>
                    <div className="form-group">
                        <label>Width (bucco lingual):</label>
                        <div className="readonly-field">{getFieldValue('ridge_width')}</div>
                    </div>

                    <div className="form-group"><label>m) Occlusion:</label></div>
                    <div className="form-group">
                        <label>Molar relation (Angle's Classification):</label>
                        <div className="readonly-field">{getFieldValue('molar_relation_page5')}</div>
                    </div>
                    <div className="form-group">
                        <label>Occlusal plane discrepancies:</label>
                        <div className="readonly-field">{getFieldValue('occlusal_plane_discrepancies')}</div>
                    </div>
                    <div className="form-group">
                        <label>Drifting of teeth:</label>
                        <div className="readonly-field">{getFieldValue('drifting_of_teeth')}</div>
                    </div>
                    <div className="form-group">
                        <label>Supra eruption / intrusion:</label>
                        <div className="readonly-field">{getFieldValue('supra_eruption_intrusion')}</div>
                    </div>
                    <div className="form-group">
                        <label>Rotation:</label>
                        <div className="readonly-field">{getFieldValue('rotation')}</div>
                    </div>
                    <div className="form-group">
                        <label>Overjet:</label>
                        <div className="readonly-field">{getFieldValue('overjet_page5')}</div>
                    </div>
                    <div className="form-group">
                        <label>Overbite:</label>
                        <div className="readonly-field">{getFieldValue('overbite_page5')}</div>
                    </div>
                    <div className="form-group"><label>Existing occlusal scheme:</label></div>
                    <div className="form-group">
                        <div className="readonly-field">{getFieldValue('occlusal_scheme')}</div>
                    </div>
                    <div className="form-group">
                        <label>Others:</label>
                        <div className="readonly-field">{getFieldValue('occlusion_others')}</div>
                    </div>
                </div>

                {/* Page 6: Abutment Evaluation / Investigations / Treatment Planning */}
                <div className={`page ${currentPage === 6 ? 'active' : ''}`}>
                    <h2>2. Abutment evaluation:</h2>
                    <div className="form-group"><label>a) Clinical evaluation:</label></div>
                    <div className="table-container">
                        <table className="data-table">
                            <tbody>
                                <tr><td>Clinical crown height</td><td>{getFieldValue('clinical_crown_height')}</td></tr>
                                <tr><td>Crown morphology</td><td>{getFieldValue('crown_morphology')}</td></tr>
                                <tr><td>Vitality</td><td>{getFieldValue('vitality')}</td></tr>
                                <tr><td>Mobility</td><td>{getFieldValue('mobility_clinical')}</td></tr>
                                <tr><td>Probing depth</td><td>{getFieldValue('probing_depth')}</td></tr>
                                <tr><td>Bleeding on probing</td><td>{getFieldValue('bleeding_on_probing')}</td></tr>
                                <tr><td>Recession</td><td>{getFieldValue('recession_clinical')}</td></tr>
                                <tr><td>Furcation involvement</td><td>{getFieldValue('furcation_involvement_clinical')}</td></tr>
                                <tr><td>Axial inclination</td><td>{getFieldValue('axial_inclination')}</td></tr>
                                <tr><td>Rotations</td><td>{getFieldValue('rotations_clinical')}</td></tr>
                                <tr><td>Pain on percussion</td><td>{getFieldValue('pain_on_percussion')}</td></tr>
                                <tr><td>Presence of restorations</td><td>{getFieldValue('presence_of_restorations')}</td></tr>
                                <tr><td>Caries</td><td>{getFieldValue('caries_clinical')}</td></tr>
                                <tr><td>Supra eruption/ intrusion</td><td>{getFieldValue('supra_eruption_intrusion_clinical')}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="form-group"><label>b) Radiographic evaluation:</label></div>
                    <div className="table-container">
                        <table className="data-table">
                            <tbody>
                                <tr><td>Peri apical status</td><td>{getFieldValue('periapical_status_rad')}</td></tr>
                                <tr><td>Lamina dura</td><td>{getFieldValue('lamina_dura_rad')}</td></tr>
                                <tr><td>Crown height</td><td>{getFieldValue('crown_height_rad')}</td></tr>
                                <tr><td>Root length</td><td>{getFieldValue('root_length_rad')}</td></tr>
                                <tr><td>Bone</td><td>{getFieldValue('bone_rad')}</td></tr>
                                <tr><td>Crown root ratio</td><td>{getFieldValue('crown_root_ratio_rad')}</td></tr>
                                <tr><td>Coronal/ proximal radioleucency</td><td>{getFieldValue('coronal_proximal_radioleucency_rad')}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h2>3. Other investigations:</h2>
                    <div className="form-group">
                        <label>OPG:</label>
                        <div className="readonly-field">{getFieldValue('opg_investigation')}</div>
                    </div>
                    <div className="form-group">
                        <label>OTHERS:</label>
                        <div className="readonly-field">{getFieldValue('other_investigations')}</div>
                    </div>

                    <h2>4. Treatment planning:</h2>
                    <div className="form-group">
                        <label>Surgery:</label>
                        <div className="readonly-field">{getFieldValue('treatment_surgery')}</div>
                    </div>
                    <div className="form-group">
                        <label>Endodontic treatment/Restorations:</label>
                        <div className="readonly-field">{getFieldValue('treatment_endodontic_restorations')}</div>
                    </div>
                    <div className="form-group">
                        <label>Periodontal treatment:</label>
                        <div className="readonly-field">{getFieldValue('treatment_periodontal')}</div>
                    </div>
                    <div className="form-group">
                        <label>Orthodontic treatment:</label>
                        <div className="readonly-field">{getFieldValue('treatment_orthodontic')}</div>
                    </div>
                    <div className="form-group"><label style={{ fontSize: '1.5em' }}>Prosthodontic</label></div>
                    <div className="form-group">
                        <label>Type of FPD:</label>
                        <div className="readonly-field">{getFieldValue('prosthodontic_type_of_fpd')}</div>
                    </div>
                    <div className="form-group">
                        <label>Abutments:</label>
                        <div className="readonly-field">{getFieldValue('prosthodontic_abutments')}</div>
                    </div>
                    <div className="form-group">
                        <label>Type of retainers:</label>
                        <div className="readonly-field">{getFieldValue('prosthodontic_type_of_retainers')}</div>
                    </div>
                    <div className="form-group">
                        <label>Type of pontic:</label>
                        <div className="readonly-field">{getFieldValue('prosthodontic_type_of_pontic')}</div>
                    </div>
                    <div className="form-group">
                        <label>Proposed occlusal scheme:</label>
                        <div className="readonly-field">{getFieldValue('prosthodontic_proposed_occlusal_scheme')}</div>
                    </div>
                </div>

                {/* Page 7: Treatment Procedure Table */}
                <div className={`page ${currentPage === totalPages ? 'active' : ''}`}>
                    <h2>5. Treatment Procedure Log:</h2>
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>S.No.</th>
                                    <th>TREATMENT PROCEDURE</th>
                                    <th>DATE</th>
                                    <th>GRADE</th>
                                    <th>STAFF IN CHARGE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { s: 1, name: "Diagnostic impression" }, { s: 2, name: "Interocclusal records" }, { s: 3, name: "Articulation of casts" }, { s: 4, name: "Diagnostic mock up" },
                                    { s: 5, name: "Fabrication of custom tray" }, { s: 6, name: "Shade selection" }, { s: 7, name: "Tooth preparation" }, { s: 8, name: "Gingival retraction" },
                                    { s: 9, name: "Definitive impression" }, { s: 10, name: "Provisional restoration" }, { s: 11, name: "Die preparation" }, { s: 12, name: "Wax pattern" },
                                    { s: 13, name: "Sprue attachment" }, { s: 14, name: "Investing" }, { s: 15, name: "Casting" }, { s: 16, name: "Finishing of metal" },
                                    { s: 17, name: "Metal try in" }, { s: 18, name: "Ceramic build up" }, { s: 19, name: "Cementation of final prosthesis" }, { s: 20, name: "Post operative checkup-1" },
                                    { s: 21, name: "Post operative checkup-2" }
                                ].map(item => (
                                    <tr key={item.s}>
                                        <td>{item.s}.</td>
                                        <td>{item.name}</td>
                                        <td>{getFieldValue(`${item.name.toLowerCase().replace(/[\s\/]/g, '_')}_field1`)}</td>
                                        <td>{getFieldValue(`${item.name.toLowerCase().replace(/[\s\/]/g, '_')}_field2`)}</td>
                                        <td>{getFieldValue(`${item.name.toLowerCase().replace(/[\s\/]/g, '_')}_field3`)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Doctor Authentication */}
                    <div style={{ marginTop: 30, borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: 20 }}>
                        <h3>Doctor Authentication</h3>
                        <div className="form-row-wide">
                            <div className="form-group">
                                <label>Doctor Name:</label>
                                <div className="readonly-field">{getFieldValue('doctorName')}</div>
                            </div>
                            <div className="form-group">
                                <label>Digital Signature:</label>
                                {getFieldValue('digitalSignature') ? (
                                    <div className="readonly-field">
                                        <img
                                            src={getFieldValue('digitalSignature')}
                                            alt="Doctor Digital Signature"
                                            style={{ maxWidth: '220px', maxHeight: '110px', display: 'block', cursor: 'pointer' }}
                                            onClick={() => setEnlargedImage(getFieldValue('digitalSignature'))}
                                        />
                                    </div>
                                ) : (
                                    <div className="readonly-field">No signature uploaded</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="navigation" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button type="button" onClick={handlePrev} disabled={currentPage === 0}>
                        Back
                    </button>

                    {!isLastPage && (
                        <button type="button" onClick={handleNext}>
                            Next
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FpdView;