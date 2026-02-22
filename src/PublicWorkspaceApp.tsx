
/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║  ⚠️  ULTRA-LIGHT PUBLIC WORKSPACE COMPONENT - CRITICAL FOR PERFORMANCE  ⚠️ ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  Loads a shared workspace item (Page, Database, or Board) without auth.    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */
import { useState, useEffect, useCallback, useMemo } from "react";

const PublicWorkspaceApp = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const extractToken = useCallback(() => {
        const path = window.location.pathname;
        // Patterns: /w/:token or /workspace/share/:token
        const patterns = [
            /^\/w\/([^/]+)$/,
            /^\/workspace\/share\/([^/]+)$/
        ];

        for (const pattern of patterns) {
            const match = path.match(pattern);
            if (match) return match[1];
        }
        return null;
    }, []);

    const token = useMemo(() => extractToken(), [extractToken]);

    useEffect(() => {
        if (!token) {
            setError("Link inválido");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const response = await fetch(`/api/public/workspace/${token}`);
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error || 'Não foi possível carregar o item');
                }

                const result = await response.json();
                setData(result);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token]);

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.skeletonTitle} />
                    <div style={styles.skeletonText} />
                    <div style={styles.skeletonText} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <h1 style={styles.errorTitle}>Ops!</h1>
                    <p style={styles.errorText}>{error}</p>
                </div>
            </div>
        );
    }

    const { item, type } = data;

    return (
        <div style={styles.container}>
            {/* Simple Header */}
            <div style={styles.header}>
                <div style={styles.brand}>NEXUS WORKSPACE</div>
                <div style={styles.badge}>Visualização Pública</div>
            </div>

            <div style={styles.content}>
                {(item.cover || (type === 'board' && item.background)) && (
                    <div
                        style={{
                            ...styles.cover,
                            backgroundImage: `url(${item.cover || item.background})`,
                            backgroundColor: (!item.cover && item.background?.startsWith('#')) ? item.background : 'transparent'
                        }}
                    />
                )}

                <div style={styles.mainArea}>
                    <div style={styles.titleRow}>
                        {item.icon && <span style={styles.titleIcon}>{item.icon}</span>}
                        <h1 style={styles.title}>{item.title}</h1>
                    </div>

                    {type === 'page' && (
                        <div style={styles.pageContent}>
                            {item.blocks?.map((block: any) => (
                                <div key={block.id} style={styles.block}>
                                    {block.type === 'text' && <p>{block.content}</p>}
                                    {block.type === 'heading-1' && <h2 style={styles.h2}>{block.content}</h2>}
                                    {block.type === 'heading-2' && <h3 style={styles.h3}>{block.content}</h3>}
                                    {block.type === 'heading-3' && <h4 style={styles.h4}>{block.content}</h4>}
                                    {block.type === 'todo' && (
                                        <div style={styles.todo}>
                                            <input type="checkbox" checked={block.properties?.checked} readOnly />
                                            <span>{block.content}</span>
                                        </div>
                                    )}
                                    {block.type === 'bulleted_list_item' && (
                                        <div style={styles.listItem}>• {block.content}</div>
                                    )}
                                    {block.type === 'numbered_list_item' && (
                                        <div style={styles.listItem}>{block.content}</div>
                                    )}
                                    {block.type === 'page' && (
                                        <div style={styles.nestedItem}>📄 {block.content} (Página vinculada)</div>
                                    )}
                                    {block.type === 'database' && (
                                        <div style={styles.nestedItem}>📊 {block.content} (Base de dados vinculada)</div>
                                    )}
                                    {block.type === 'board' && (
                                        <div style={styles.nestedItem}>📋 {block.content} (Quadro vinculado)</div>
                                    )}
                                    {block.type === 'image' && block.properties?.url && (
                                        <img src={block.properties.url} style={styles.image} alt="" />
                                    )}
                                    {block.type === 'divider' && <hr style={styles.divider} />}
                                </div>
                            ))}
                            {!item.blocks?.length && <p style={styles.empty}>Esta página não possui conteúdo visível.</p>}
                        </div>
                    )}

                    {type === 'board' && (
                        <div style={styles.boardView}>
                            <div style={styles.boardLists}>
                                {item.lists?.map((list: any) => {
                                    const isLightColor = (hex: string) => {
                                        if (!hex || !hex.startsWith('#')) return false;
                                        const r = parseInt(hex.slice(1, 3), 16);
                                        const g = parseInt(hex.slice(3, 5), 16);
                                        const b = parseInt(hex.slice(5, 7), 16);
                                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                        return brightness > 180;
                                    };

                                    const headerTextColor = list.textColor || (list.color ? (isLightColor(list.color) ? '#0f172a' : '#ffffff') : '#ffffff');

                                    return (
                                        <div key={list.id} style={{ ...styles.boardList, borderTop: `4px solid ${list.color || '#333'}` }}>
                                            <div style={{ ...styles.listHeader, color: headerTextColor }}>
                                                <div style={styles.listTitle}>{list.title}</div>
                                                <div style={styles.listCount}>
                                                    {list.cards?.length || item.cards?.filter((c: any) => c.listId === list.id).length || 0}
                                                </div>
                                            </div>
                                            <div style={styles.boardCards}>
                                                {(list.cards || item.cards?.filter((c: any) => c.listId === list.id))?.map((card: any) => (
                                                    <div key={card.id} style={styles.boardCard}>
                                                        {/* Labels */}
                                                        {card.labels && card.labels.length > 0 && (
                                                            <div style={styles.cardLabels}>
                                                                {card.labels.map((label: any, idx: number) => (
                                                                    <div
                                                                        key={idx}
                                                                        style={{
                                                                            ...styles.cardLabel,
                                                                            backgroundColor: label.color || '#333'
                                                                        }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}

                                                        <div style={styles.cardTitle}>{card.title}</div>

                                                        {card.description && (
                                                            <div style={styles.cardDesc}>
                                                                {card.description.length > 60
                                                                    ? card.description.substring(0, 60) + '...'
                                                                    : card.description}
                                                            </div>
                                                        )}

                                                        <div style={styles.cardFooter}>
                                                            {card.dueDate && (
                                                                <div style={styles.cardDate}>
                                                                    <span style={{ marginRight: '4px' }}>📅</span>
                                                                    {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date(card.dueDate))}
                                                                    {card.dueTime && ` • ${card.dueTime}`}

                                                                    {new Date(card.dueDate).getTime() > Date.now() && (
                                                                        <span style={styles.soonBadge}>EM BREVE</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {card.checklists && card.checklists.length > 0 && (
                                                                <div style={styles.cardStat}>
                                                                    ☑️ {card.checklists.reduce((acc: number, cl: any) => acc + cl.items.filter((i: any) => i.completed).length, 0)} / {card.checklists.reduce((acc: number, cl: any) => acc + cl.items.length, 0)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!list.cards?.length && !item.cards?.filter((c: any) => c.listId === list.id).length) && (
                                                    <div style={styles.emptyList}>Nenhum card nesta lista</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {type === 'database' && (
                        <div style={styles.databaseView}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        {item.columns?.map((col: any) => (
                                            <th key={col.id}>{col.name}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {item.rows?.map((row: any) => (
                                        <tr key={row.id}>
                                            {item.columns?.map((col: any) => (
                                                <td key={col.id}>{row.cells?.[col.id] || '-'}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        body { margin: 0; background-color: #030303; color: #ffffff; font-family: Inter, system-ui, sans-serif; }
        h2 { font-size: 1.5rem; margin-top: 2rem; color: #daa520; }
        p { line-height: 1.6; opacity: 0.9; }
      `}</style>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#030303',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid #1a1a1a',
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
    },
    brand: {
        fontWeight: 800,
        letterSpacing: '0.1em',
        color: '#daa520',
        fontSize: '0.875rem',
    },
    badge: {
        fontSize: '0.75rem',
        backgroundColor: 'rgba(218, 165, 32, 0.1)',
        color: '#daa520',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        border: '1px solid rgba(218, 165, 32, 0.2)',
    },
    content: {
        flex: 1,
        overflowY: 'auto',
    },
    cover: {
        height: '30vh',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        width: '100%',
    },
    mainArea: {
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '3rem 2rem',
    },
    titleRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
    },
    titleIcon: {
        fontSize: '3rem',
    },
    title: {
        fontSize: '2.5rem',
        fontWeight: 700,
        margin: 0,
        background: 'linear-gradient(to right, #fff, #888)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    pageContent: {
        fontSize: '1.125rem',
    },
    block: {
        marginBottom: '1rem',
    },
    todo: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    empty: {
        opacity: 0.5,
        fontStyle: 'italic',
    },
    boardView: {
        width: '100%',
        overflowX: 'auto',
    },
    boardLists: {
        display: 'flex',
        gap: '1.5rem',
        minHeight: '400px',
    },
    boardList: {
        minWidth: '280px',
        maxWidth: '280px',
        backgroundColor: '#0a0a0a',
        borderRadius: '12px',
        padding: '1rem',
        border: '1px solid #1a1a1a',
    },
    listHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
    },
    listTitle: {
        fontWeight: 600,
        fontSize: '0.875rem',
    },
    listCount: {
        fontSize: '0.75rem',
        opacity: 0.5,
    },
    boardCards: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    boardCard: {
        backgroundColor: '#111',
        padding: '0.75rem',
        borderRadius: '8px',
        border: '1px solid #222',
        fontSize: '0.875rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
    cardDate: {
        fontSize: '0.75rem',
        marginTop: '0.5rem',
        opacity: 0.6,
    },
    cardTitle: {
        fontWeight: 600,
        fontSize: '0.9375rem',
        marginBottom: '0.5rem',
        color: '#fff',
    },
    cardLabels: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        marginBottom: '8px',
    },
    cardLabel: {
        height: '6px',
        width: '32px',
        borderRadius: '3px',
    },
    cardDesc: {
        fontSize: '0.8125rem',
        opacity: 0.5,
        marginBottom: '0.75rem',
        lineHeight: 1.4,
    },
    cardFooter: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '0.5rem',
        borderTop: '1px solid #222',
        paddingTop: '0.5rem',
    },
    cardStat: {
        fontSize: '0.75rem',
        opacity: 0.6,
    },
    soonBadge: {
        fontSize: '0.625rem',
        fontWeight: 700,
        backgroundColor: 'rgba(218, 165, 32, 0.15)',
        color: '#daa520',
        padding: '2px 6px',
        borderRadius: '4px',
        marginLeft: '8px',
        border: '1px solid rgba(218, 165, 32, 0.3)',
    },
    emptyList: {
        fontSize: '0.8125rem',
        opacity: 0.3,
        textAlign: 'center',
        padding: '1rem 0',
        fontStyle: 'italic',
    },
    databaseView: {
        overflowX: 'auto',
        borderRadius: '8px',
        border: '1px solid #1a1a1a',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.875rem',
    },
    card: {
        backgroundColor: '#0a0a0a',
        padding: '2rem',
        borderRadius: '16px',
        border: '1px solid #1a1a1a',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
    },
    skeletonTitle: {
        height: '2rem',
        backgroundColor: '#1a1a1a',
        width: '60%',
        margin: '0 auto 1.5rem',
        borderRadius: '4px',
    },
    skeletonText: {
        height: '1rem',
        backgroundColor: '#1a1a1a',
        width: '80%',
        margin: '0 auto 0.5rem',
        borderRadius: '4px',
    },
    errorTitle: {
        color: '#ef4444',
        marginBottom: '1rem',
    },
    errorText: {
        opacity: 0.8,
    },
    h2: {
        fontSize: '2rem',
        fontWeight: 700,
        margin: '2rem 0 1rem',
        color: '#fff',
    },
    h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
        margin: '1.5rem 0 0.75rem',
        color: '#daa520',
    },
    h4: {
        fontSize: '1.25rem',
        fontWeight: 600,
        margin: '1.25rem 0 0.5rem',
        color: '#bbb',
    },
    listItem: {
        marginBottom: '0.5rem',
        paddingLeft: '1rem',
    },
    nestedItem: {
        padding: '0.75rem 1rem',
        backgroundColor: 'rgba(218, 165, 32, 0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(218, 165, 32, 0.1)',
        margin: '1rem 0',
        fontSize: '0.875rem',
        color: '#daa520',
    },
    image: {
        maxWidth: '100%',
        borderRadius: '12px',
        margin: '1.5rem 0',
    },
    divider: {
        border: 'none',
        borderTop: '1px solid #1a1a1a',
        margin: '2rem 0',
    }
};

export default PublicWorkspaceApp;
