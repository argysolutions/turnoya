import { pool } from '../config/db.js'

export const getDashboardStats = async (req, reply) => {
  const businessId = req.business.id
  
  try {
    // 1. Ingresos por día (últimos 30 días)
    const dailyRevenue = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        SUM(amount) as total
      FROM sales
      WHERE business_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `, [businessId])

    // 2. Servicios más vendidos
    const topServices = await pool.query(`
      SELECT 
        service_name as name,
        COUNT(*) as count,
        SUM(amount) as revenue
      FROM sales
      WHERE business_id = $1 AND service_name IS NOT NULL
      GROUP BY service_name
      ORDER BY count DESC
      LIMIT 5
    `, [businessId])

    // 3. Resumen general (Hoy vs Ayer)
    const stats = await pool.query(`
      SELECT
        SUM(CASE WHEN created_at >= CURRENT_DATE THEN amount ELSE 0 END) as today_revenue,
        SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE THEN amount ELSE 0 END) as yesterday_revenue,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today_sales,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE THEN 1 END) as yesterday_sales
      FROM sales
      WHERE business_id = $1
    `, [businessId])

    reply.send({
      dailyRevenue: dailyRevenue.rows,
      topServices: topServices.rows,
      summary: stats.rows[0]
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    reply.status(500).send({ error: 'Error al obtener estadísticas' })
  }
}
